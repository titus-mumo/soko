import twilio from "twilio";

function getClient() {
  return twilio(Bun.env.TWILIO_ACCOUNT_SID!, Bun.env.TWILIO_AUTH_TOKEN!);
}

export async function sendOtp(phone: string): Promise<boolean> {
  try {
    await getClient()
      .verify.v2.services(Bun.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({
        to: phone,
        channel: "sms",
      });
    return true;
  } catch (error) {
    console.error("Twilio error:", error);
    return false;
  }
}

export async function verifyOtpWithTwilio(
  phone: string,
  code: string,
): Promise<boolean> {
  try {
    const result = await getClient()
      .verify.v2.services(Bun.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({
        to: phone,
        code,
      });
    return result.status === "approved";
  } catch (error) {
    console.error("Twilio verify error:", error);
    return false;
  }
}
