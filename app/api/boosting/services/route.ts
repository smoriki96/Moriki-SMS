import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { shoprimeRequest } from "../../../../lib/shoprime";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getPlatform(name: string) {
  const value = name.toLowerCase();

  if (value.includes("instagram")) return "Instagram";
  if (value.includes("tiktok")) return "TikTok";
  if (value.includes("facebook")) return "Facebook";
  if (value.includes("youtube")) return "YouTube";
  if (value.includes("twitter") || value.includes(" x ")) return "Twitter/X";
  if (value.includes("telegram")) return "Telegram";
  if (value.includes("spotify")) return "Spotify";

  return "Other";
}

export async function GET() {
  try {
    const result = await shoprimeRequest("services");

    if (!Array.isArray(result)) {
      throw new Error("Invalid services response.");
    }

    const rows = result
      .map((item: any) => {
        const serviceId = String(
          item?.service ?? item?.id ?? ""
        ).trim();

        const name = String(
          item?.name ?? ""
        ).trim();

        const providerRate = Number(
          item?.rate ?? item?.price ?? 0
        );

        const min = Math.max(
          1,
          Math.floor(Number(item?.min ?? 1))
        );

        const max = Math.max(
          min,
          Math.floor(Number(item?.max ?? min))
        );

        if (
          !serviceId ||
          !name ||
          !Number.isFinite(providerRate) ||
          providerRate < 0
        ) {
          return null;
        }

        return {
          provider_service_id: serviceId,
          platform: getPlatform(name),
          category: getPlatform(name),
          name,
          provider_rate: providerRate,
          min_quantity: min,
          max_quantity: max,
        };
      })
      .filter(Boolean);

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        services: [],
      });
    }

    const { error } = await supabaseAdmin
      .from("boosting_services")
      .upsert(
        rows.map((row: any) => ({
          ...row,
          markup_type: "percentage",
          markup_value: 50,
          enabled: true,
          updated_at: new Date().toISOString(),
        })),
        {
          onConflict: "provider_service_id",
        }
      );

    if (error) {
      console.error("Boosting services database error:", error);
      throw new Error("Unable to save boosting services.");
    }

    const { data, error: readError } = await supabaseAdmin
      .from("boosting_services")
      .select(
        "id, provider_service_id, platform, category, name, min_quantity, max_quantity, provider_rate, markup_type, markup_value"
      )
      .eq("enabled", true)
      .order("platform")
      .order("name");

    if (readError) {
      console.error("Boosting services read error:", readError);
      throw new Error("Unable to load boosting services.");
    }

    const services = (data ?? []).map((service) => {
      const ratePer1000 = Number(service.provider_rate);

      const customerRate =
        service.markup_type === "percentage"
          ? ratePer1000 *
            (1 + Number(service.markup_value) / 100)
          : ratePer1000 +
            Number(service.markup_value) * 1000;

      return {
        id: service.id,
        service: service.provider_service_id,
        platform: service.platform,
        category: service.category,
        name: service.name,
        min: service.min_quantity,
        max: service.max_quantity,
        pricePer1000: Math.ceil(customerRate * 100) / 100,
        currency: "NGN",
      };
    });

    return NextResponse.json({
      success: true,
      services,
    });
  } catch (error) {
    console.error("Boosting services error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load boosting services.",
      },
      { status: 502 }
    );
  }
}
