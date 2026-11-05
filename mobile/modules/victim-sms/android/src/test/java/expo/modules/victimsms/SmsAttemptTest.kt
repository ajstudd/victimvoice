package expo.modules.victimsms
import org.junit.Test
import org.junit.Assert.*
import org.json.JSONObject
class SmsAttemptTest {
 private fun row(parts:Int)=JSONObject().put("started",System.currentTimeMillis()).put("parts",parts)
 @Test fun noCallbacksStayPendingThenBecomeUnknownWithoutFallback(){
  assertEquals("submitted",SmsAttempts.summary(row(1))["status"])
  val old=row(1).put("started",System.currentTimeMillis()-21000)
  assertEquals("unknown",SmsAttempts.summary(old)["status"]);assertEquals(false,SmsAttempts.summary(old)["fallbackAllowed"])
 }
 @Test fun onlyAllFailedPartsPermitFallback(){
  val failed=row(2).put("sent",JSONObject().put("0",2).put("1",4))
  assertEquals("failed",SmsAttempts.summary(failed)["status"]);assertEquals(true,SmsAttempts.summary(failed)["fallbackAllowed"])
  val partial=row(2).put("sent",JSONObject().put("0",-1).put("1",4))
  assertEquals("unknown",SmsAttempts.summary(partial)["status"]);assertEquals(false,SmsAttempts.summary(partial)["fallbackAllowed"])
 }
 @Test fun acceptedAndDeliveredAreDistinct(){
  val value=row(1).put("sent",JSONObject().put("0",-1))
  assertEquals("sent",SmsAttempts.summary(value)["status"]);assertEquals(false,SmsAttempts.summary(value)["fallbackAllowed"])
  value.put("delivery",JSONObject().put("0",-1));assertEquals("delivered",SmsAttempts.summary(value)["status"])
 }
}
