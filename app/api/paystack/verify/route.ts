import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PAYSTACK_SECRET_KEY =
  process.env.PAYSTACK_SECRET_KEY;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const reference =
      searchParams.get("reference") ||
      searchParams.get("trxref");

    if (!reference) {
      return NextResponse.redirect(
        new URL(
          "/wallet?payment=failed&message=Missing%20payment%20reference",
          request.url
        )
      );
    }

    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.redirect(
        new URL(
          "/wallet?payment=failed&message=Paystack%20configuration%20missing",
          request.url
        )
      );
    }

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.redirect(
        new URL(
          "/wallet?payment=failed&message=Wallet%20configuration%20missing",
          request.url
        )
      );
    }

    /*
     * Verify the payment directly with Paystack.
     */
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const paystackData =
      await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackData?.status ||
      paystackData?.data?.status !==
        "success"
    ) {
      return NextResponse.redirect(
        new URL(
          `/wallet?payment=failed&message=${encodeURIComponent(
            "Payment was not successful."
          )}`,
          request.url
        )
      );
    }

    const payment =
      paystackData.data;

    /*
     * Paystack amount is in kobo.
     */
    const amount =
      Number(payment.amount) / 100;

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.redirect(
        new URL(
          "/wallet?payment=failed&message=Invalid%20payment%20amount",
          request.url
        )
      );
    }

    /*
     * Get the user ID from Paystack metadata.
     *
     * Your initialize route should send:
     *
     * metadata: {
     *   user_id: user.id
     * }
     */
    const userId =
      payment?.metadata?.user_id ||
      payment?.metadata?.userId;

    if (!userId) {
      return NextResponse.redirect(
        new URL(
          "/wallet?payment=failed&message=User%20information%20missing",
          request.url
        )
      );
    }

    /*
     * Use Supabase service role on the SERVER ONLY.
     */
    const supabaseAdmin =
      createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    /*
     * Prevent the same Paystack transaction
     * from being credited twice.
     */
    const {
      data: existingTransaction,
      error: existingError,
    } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id")
      .eq("reference", reference)
      .maybeSingle();

    if (existingError) {
      console.error(
        "CHECK TRANSACTION ERROR:",
        existingError
      );

      return NextResponse.redirect(
        new URL(
          "/wallet?payment=failed&message=Unable%20to%20check%20payment",
          request.url
        )
      );
    }

    /*
     * If it was already credited, simply return
     * the customer to the wallet.
     */
    if (existingTransaction) {
      return NextResponse.redirect(
        new URL(
          "/wallet?payment=success",
          request.url
        )
      );
    }

    /*
     * Get the user's wallet.
     */
    const {
      data: wallet,
      error: walletError,
    } = await supabaseAdmin
      .from("wallets")
      .select("id, balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (walletError) {
      console.error(
        "WALLET LOOKUP ERROR:",
        walletError
      );

      return NextResponse.redirect(
        new URL(
          "/wallet?payment=failed&message=Unable%20to%20find%20wallet",
          request.url
        )
      );
    }

    if (!wallet) {
      /*
       * Create the wallet if this is the user's
       * first funding transaction.
       */
      const {
        data: newWallet,
        error: createWalletError,
      } = await supabaseAdmin
        .from("wallets")
        .insert({
          user_id: userId,
          balance: amount,
        })
        .select("id, balance")
        .single();

      if (createWalletError) {
        console.error(
          "CREATE WALLET ERROR:",
          createWalletError
        );

        return NextResponse.redirect(
          new URL(
            "/wallet?payment=failed&message=Unable%20to%20create%20wallet",
            request.url
          )
        );
      }

      const {
        error: transactionError,
      } = await supabaseAdmin
        .from("wallet_transactions")
        .insert({
          user_id: userId,
          wallet_id: newWallet.id,
          amount,
          type: "deposit",
          status: "completed",
          description:
            "Paystack wallet funding",
          reference,
        });

      if (transactionError) {
        console.error(
          "TRANSACTION INSERT ERROR:",
          transactionError
        );

        return NextResponse.redirect(
          new URL(
            "/wallet?payment=failed&message=Unable%20to%20record%20transaction",
            request.url
          )
        );
      }

      return NextResponse.redirect(
        new URL(
          "/wallet?payment=success",
          request.url
        )
      );
    }

    /*
     * Existing wallet:
     * add the verified payment amount.
     */
    const currentBalance =
      Number(wallet.balance) || 0;

    const newBalance =
      currentBalance + amount;

    const {
      error: updateWalletError,
    } = await supabaseAdmin
      .from("wallets")
      .update({
        balance: newBalance,
      })
      .eq("id", wallet.id);

    if (updateWalletError) {
      console.error(
        "UPDATE WALLET ERROR:",
        updateWalletError
      );

      return NextResponse.redirect(
        new URL(
          "/wallet?payment=failed&message=Unable%20to%20update%20wallet",
          request.url
        )
      );
    }

    /*
     * Record the successful deposit.
     */
    const {
      error: transactionError,
    } = await supabaseAdmin
      .from("wallet_transactions")
      .insert({
        user_id: userId,
        wallet_id: wallet.id,
        amount,
        type: "deposit",
        status: "completed",
        description:
          "Paystack wallet funding",
        reference,
      });

    if (transactionError) {
      console.error(
        "TRANSACTION INSERT ERROR:",
        transactionError
      );

      return NextResponse.redirect(
        new URL(
          "/wallet?payment=failed&message=Unable%20to%20record%20transaction",
          request.url
        )
      );
    }

    /*
     * SUCCESS:
     * Send the customer back to the wallet,
     * NOT the homepage.
     */
    return NextResponse.redirect(
      new URL(
        "/wallet?payment=success",
        request.url
      )
    );
  } catch (error) {
    console.error(
      "PAYSTACK VERIFY ERROR:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/wallet?payment=failed&message=Payment%20verification%20failed",
        request.url
      )
    );
  }
}