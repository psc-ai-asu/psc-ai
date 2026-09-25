'use server';

export async function verifyCaptchaAction(captchaToken) {
  if (!captchaToken || !process.env.HCAPTCHA_SECRET_KEY) {
    return { error: 'CAPTCHA verification is not configured.' };
  }

  try {
    const response = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.HCAPTCHA_SECRET_KEY,
        response: captchaToken,
      }),
    });
    const data = await response.json();

    if (!data.success) {
      return { error: 'CAPTCHA verification failed. Please try again.' };
    }

    return { success: true };
  } catch (_) {
    return { error: 'CAPTCHA verification failed. Please try again.' };
  }
}
