"use server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function submitEmailAction(email, role, captchaToken) {
    if (!email || !captchaToken) {
        return { error: "Missing required fields" };
    }

    try {
        const response = await fetch("https://api.hcaptcha.com/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                secret: process.env.HCAPTCHA_SECRET_KEY || "",
                response: captchaToken,
            }),
        });

        const data = await response.json();

        if (!data.success) {
            return { error: "Invalid CAPTCHA" };
        }
    } catch (error) {
        return { error: "Failed to verify CAPTCHA" };
    }

    // Insert into Supabase
    try {
        const { error } = await supabase
            .schema("landing")
            .from("emails")
            .insert([{ email, role }]);

        if (error?.code === "23505") {
            return { error: "Duplicate email already in database" };
        } else if (error) {
            return { error: "Failed to save email" };
        }

        return { success: true };
    } catch (error) {
        return { error: "Unexpected error occurred" };
    }
}
