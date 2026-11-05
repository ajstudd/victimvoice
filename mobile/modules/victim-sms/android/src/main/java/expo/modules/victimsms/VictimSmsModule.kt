package expo.modules.victimsms

import android.Manifest
import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.net.Uri
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

// Metadata only: message text and destination numbers are never persisted here.
internal object SmsAttempts {
  private const val FILE = "vv_sms_attempt_status"
  @Synchronized fun read(context: Context, id: String): JSONObject? {
    val raw = context.getSharedPreferences(FILE, Context.MODE_PRIVATE).getString(id, null) ?: return null
    return JSONObject(raw)
  }
  @Synchronized fun store(context: Context, id: String, value: JSONObject) {
    context.getSharedPreferences(FILE, Context.MODE_PRIVATE).edit().putString(id, value.toString()).commit()
  }
  @Synchronized fun result(context: Context, id: String, part: Int, delivered: Boolean, result: Int) {
    val row = read(context, id) ?: return
    if(part < 0 || part >= row.getInt("parts")) return
    // A late platform callback can resolve an earlier uncertain exception.
    if (row.optString("forced") == "unknown") row.remove("forced")
    val key = if (delivered) "delivery" else "sent"
    val values = row.optJSONObject(key) ?: JSONObject()
    if (!values.has(part.toString())) values.put(part.toString(), result)
    row.put(key, values)
    store(context, id, row)
  }
  fun summary(row: JSONObject?): Map<String, Any> {
    if (row == null) return mapOf("status" to "missing", "fallbackAllowed" to false)
    val forced = row.optString("forced")
    if (forced.isNotEmpty()) return mapOf("status" to forced, "fallbackAllowed" to (forced == "unavailable"))
    val parts = row.getInt("parts")
    val sent = row.optJSONObject("sent") ?: JSONObject()
    val delivery = row.optJSONObject("delivery") ?: JSONObject()
    val successes = (0 until parts).count { sent.has(it.toString()) && sent.getInt(it.toString()) == Activity.RESULT_OK }
    val delivered = (0 until parts).count { delivery.has(it.toString()) && delivery.getInt(it.toString()) == Activity.RESULT_OK }
    val status = when {
      delivered == parts -> "delivered"
      successes == parts -> "sent"
      sent.length() == parts && successes == 0 -> "failed"
      sent.length() == parts || System.currentTimeMillis() - row.getLong("started") > 20000 -> "unknown"
      else -> "submitted"
    }
    return mapOf("status" to status, "fallbackAllowed" to (status == "failed" && (0 until parts).all { sent.optInt(it.toString()) in setOf(SmsManager.RESULT_ERROR_GENERIC_FAILURE,SmsManager.RESULT_ERROR_RADIO_OFF,SmsManager.RESULT_ERROR_NO_SERVICE) }), "parts" to parts, "acceptedParts" to successes)
  }
  fun prune(context: Context) {
    val prefs = context.getSharedPreferences(FILE, Context.MODE_PRIVATE)
    val editor = prefs.edit()
    prefs.all.forEach { (key, value) ->
      try { if (System.currentTimeMillis() - JSONObject(value as String).getLong("started") > 7 * 86400000L) editor.remove(key) } catch (_: Exception) { editor.remove(key) }
    }
    editor.apply()
  }
}
class SmsStatusReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getStringExtra("attempt") ?: return
    SmsAttempts.result(context, id, intent.getIntExtra("part", -1), intent.getBooleanExtra("delivery", false), resultCode)
    RelaySecrets.enqueue(context,id)
  }
}
class VictimSmsModule : Module() {
  private fun context(): Context = appContext.reactContext?.applicationContext ?: throw IllegalStateException("App context unavailable")
  private fun usable(context: Context): Boolean = context.packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY_MESSAGING) && SubscriptionManager.isValidSubscriptionId(SubscriptionManager.getDefaultSmsSubscriptionId())
  override fun definition() = ModuleDefinition {
    Name("VictimSms")
    Function("capabilities") {
      val c = context()
      mapOf("supported" to c.packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY_MESSAGING), "defaultSim" to usable(c), "permission" to (c.checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED))
    }
    AsyncFunction("getAttemptAsync") { id: String -> SmsAttempts.summary(SmsAttempts.read(context(), id)) }
    AsyncFunction("attachRelayAsync") { id: String, endpoint: String, token: String, event: String, contact: String ->
      require(endpoint.matches(Regex("^https://[a-z0-9]+\\.supabase\\.co/functions/v1/sos$")) && token.length in 50..8000 && id.matches(Regex("^[a-fA-F0-9-]{36}$"))) { "Invalid relay configuration" }
      val c=context()
      if (RelaySecrets.get(c,id)==null) RelaySecrets.put(c,id,JSONObject().put("url",endpoint).put("token",token).put("event",event).put("contact",contact).put("expires",System.currentTimeMillis()+300000))
      RelaySecrets.enqueue(c,id)
    }
    AsyncFunction("clearRelayAsync") { ids: List<String> -> ids.forEach { RelaySecrets.remove(context(),it) } }
    AsyncFunction("sendAsync") { id: String, destination: String, body: String ->
      val c = context()
      require(id.matches(Regex("^[a-fA-F0-9-]{36}$")) && destination.matches(Regex("^\\+[1-9][0-9]{7,14}$")) && body.length in 1..1000) { "Invalid SMS input" }
      synchronized(SmsAttempts) {
        val prior = SmsAttempts.read(c, id)
        if (prior != null) return@AsyncFunction SmsAttempts.summary(prior)
        SmsAttempts.prune(c)
        if (!usable(c) || c.checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
          val unavailable = JSONObject().put("started",System.currentTimeMillis()).put("parts",1).put("forced","unavailable")
          SmsAttempts.store(c,id,unavailable); RelaySecrets.enqueue(c,id)
          return@AsyncFunction SmsAttempts.summary(unavailable)
        }
        val manager = if (Build.VERSION.SDK_INT >= 31) c.getSystemService(SmsManager::class.java).createForSubscriptionId(SubscriptionManager.getDefaultSmsSubscriptionId()) else SmsManager.getSmsManagerForSubscriptionId(SubscriptionManager.getDefaultSmsSubscriptionId())
        val parts = manager.divideMessage(body)
        val row = JSONObject().put("started", System.currentTimeMillis()).put("parts", parts.size)
        SmsAttempts.store(c, id, row)
        fun callback(part: Int, delivery: Boolean): PendingIntent {
          val intent = Intent(c, SmsStatusReceiver::class.java).setData(Uri.parse("victimvoice-sms://$id/${if(delivery) "delivery" else "sent"}/$part"))
            .putExtra("attempt", id).putExtra("part", part).putExtra("delivery", delivery)
          return PendingIntent.getBroadcast(c, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }
        try {
          manager.sendMultipartTextMessage(destination, null, parts, ArrayList(parts.indices.map { callback(it, false) }), ArrayList(parts.indices.map { callback(it, true) }))
        } catch (_: SecurityException) {
          row.put("forced", "unavailable"); SmsAttempts.store(c, id, row)
        } catch (_: Exception) {
          // An exception after entering the platform send has an uncertain outcome.
          row.put("forced", "unknown"); SmsAttempts.store(c, id, row)
        }
        RelaySecrets.enqueue(c,id)
        SmsAttempts.summary(row)
      }
    }
  }
}
