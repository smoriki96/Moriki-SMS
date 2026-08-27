import { NextResponse } from "next/server";
import twilio from "twilio";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const country =
      searchParams.get("country") || "US";

    const accountSid =
      process.env.TWILIO_ACCOUNT_SID;

    const apiKeySid =
      process.env.TWILIO_API_KEY_SID;

    const apiKeySecret =
      process.env.TWILIO_API_KEY_SECRET;

    if (
      !accountSid ||
      !apiKeySid ||
      !apiKeySecret
    ) {
      return NextResponse.json(
        {
          error:
            "Twilio environment variables are missing.",
        },
        { status: 500 }
      );
    }

    const client = twilio(
      apiKeySid,
      apiKeySecret,
      {
        accountSid,
      }
    );

    const numbers =
      await client
        .availablePhoneNumbers(country)
        .local.list({
          smsEnabled: true,
          limit: 20,
        });

    const results = numbers.map((number) => ({
      phoneNumber:
        number.phoneNumber,
      friendlyName:
        number.friendlyName,
      locality:
        number.locality,
      region:
        number.region,
      postalCode:
        number.postalCode,
      capabilities:
        number.capabilities,
    }));

    return NextResponse.json({
      success: true,
      country,
      numbers: results,
    });
  } catch (error) {
    console.error(
      "Twilio number search error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to search Twilio numbers.",
      },
      { status: 500 }
    );
  }
}