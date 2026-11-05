package expo.modules.victimsms

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.work.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.security.KeyStore
import java.util.concurrent.TimeUnit
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

// Auth is device-encrypted, bounded to five minutes, and never put in WorkManager Data.
internal object RelaySecrets {
  private fun key(): SecretKey {
    val store=KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (store.getKey("vv.sms.relay",null) as? SecretKey)?.let { return it }
    return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply {
      init(KeyGenParameterSpec.Builder("vv.sms.relay",KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
    }.generateKey()
  }
  @Synchronized fun put(c:Context,id:String,row:JSONObject){
    val cipher=Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE,key()) }
    cipher.updateAAD(id.toByteArray(Charsets.UTF_8))
    val enc=cipher.doFinal(row.toString().toByteArray(Charsets.UTF_8))
    val value=Base64.encodeToString(cipher.iv,Base64.NO_WRAP)+":"+Base64.encodeToString(enc,Base64.NO_WRAP)
    c.getSharedPreferences("vv.sms.relay.sealed",Context.MODE_PRIVATE).edit().putString(id,value).commit()
  }
  @Synchronized fun get(c:Context,id:String):JSONObject?{
    val raw=c.getSharedPreferences("vv.sms.relay.sealed",Context.MODE_PRIVATE).getString(id,null)?:return null
    return try{
      val pieces=raw.split(':');val cipher=Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE,key(),GCMParameterSpec(128,Base64.decode(pieces[0],Base64.NO_WRAP))) }
      cipher.updateAAD(id.toByteArray(Charsets.UTF_8))
      val row=JSONObject(String(cipher.doFinal(Base64.decode(pieces[1],Base64.NO_WRAP)),Charsets.UTF_8))
      if(row.getLong("expires")<System.currentTimeMillis()){remove(c,id);null}else row
    }catch(_:Exception){remove(c,id);null}
  }
  fun remove(c:Context,id:String){c.getSharedPreferences("vv.sms.relay.sealed",Context.MODE_PRIVATE).edit().remove(id).commit()}
  fun enqueue(c:Context,id:String){
    val result=SmsAttempts.summary(SmsAttempts.read(c,id));val status=result["status"] as String
    if(status in listOf("missing","submitted")||get(c,id)==null)return
    val work=OneTimeWorkRequestBuilder<SmsRelayWorker>().setInputData(workDataOf("attempt" to id)).setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).setBackoffCriteria(BackoffPolicy.EXPONENTIAL,10,TimeUnit.SECONDS).build()
    WorkManager.getInstance(c).enqueueUniqueWork("vv-sms-$id-$status",ExistingWorkPolicy.KEEP,work)
  }
}
class SmsRelayWorker(c:Context,p:WorkerParameters):Worker(c,p){
 override fun doWork():Result{
  val id=inputData.getString("attempt")?:return Result.failure()
  val secret=RelaySecrets.get(applicationContext,id)?:return Result.success()
  val summary=SmsAttempts.summary(SmsAttempts.read(applicationContext,id))
  val status=summary["status"] as String
  if(status in listOf("missing","submitted"))return Result.success()
  val signature=status+":"+summary["fallbackAllowed"]
  if(secret.optString("reported")==signature)return Result.success()
  return try{
    val body=JSONObject().put("action","native").put("id",secret.getString("event")).put("contactId",secret.getString("contact")).put("status",status).put("fallbackAllowed",summary["fallbackAllowed"])
    val connection=URL(secret.getString("url")).openConnection() as HttpURLConnection
    connection.requestMethod="POST";connection.connectTimeout=10000;connection.readTimeout=10000;connection.doOutput=true
    connection.setRequestProperty("Authorization","Bearer "+secret.getString("token"));connection.setRequestProperty("Content-Type","application/json")
    connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
    val code=connection.responseCode;connection.disconnect()
    if(code in 200..299){secret.put("reported",signature);RelaySecrets.put(applicationContext,id,secret);Result.success()}
    else if(code==401||code==403){RelaySecrets.remove(applicationContext,id);Result.failure()}
    else if(runAttemptCount<3)Result.retry()else Result.failure()
  }catch(_:Exception){if(runAttemptCount<3)Result.retry()else Result.failure()}
 }
}
