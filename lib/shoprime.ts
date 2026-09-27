import "server-only";

const SHOPRIME_API_URL =
  process.env.SHOPRIME_API_URL || "https://shoprime.ng/api/v2";

const SHOPRIME_API_KEY = process.env.SHOPRIME_API_KEY;

if (!SHOPRIME_API_KEY) {
  throw new Error("SHOPRIME_API_KEY is not configured.");
}

type ShoprimeResponse = Record<string, unknown>;

export async function shoprimeRequest(
  action: string,
  data: Record<string, string | number | undefined> = {}
): Promise<ShoprimeResponse | ShoprimeResponse[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(SHOPRIME_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        key: SHOPRIME_API_KEY,
        action,
        ...data,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const raw = await response.text();

    let result: unknown;

    try {
      result = JSON.parse(raw);
    } catch {
      throw new Error("Invalid response from provider.");
    }

    if (!response.ok) {
      console.error("Shoprime HTTP error:", response.status);
      throw new Error("Provider request failed.");
    }

    if (
      result &&
      typeof result === "object" &&
      "error" in result
    ) {
      console.error("Shoprime provider error:", result);
      throw new Error("Provider request failed.");
    }

    return result as ShoprimeResponse | ShoprimeResponse[];
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Provider request timed out.");
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Provider request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function getShoprimeOrderStatus(orderId: string) {
  return shoprimeRequest('status', { order: orderId });
}
