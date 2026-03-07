const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '';

interface CustomerData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address?: string;
  city?: string;
  notes?: string;
}

interface CheckoutResult {
  success: boolean;
  orderConfirmed?: boolean;
  orderNumber?: string;
  redirectUrl?: string;
  error?: string;
}

class CookieJar {
  private cookies: Map<string, string> = new Map();

  update(headers: Headers) {
    const raw = headers.getSetCookie?.();
    if (raw) {
      for (const cookieStr of raw) {
        const nameValue = cookieStr.split(';')[0];
        const eqIndex = nameValue.indexOf('=');
        if (eqIndex > 0) {
          const name = nameValue.substring(0, eqIndex).trim();
          const value = nameValue.substring(eqIndex + 1).trim();
          this.cookies.set(name, value);
        }
      }
    }
  }

  toString(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
}

function extractAuthToken(html: string): string | null {
  const match = html.match(/name="authenticity_token"[^>]*value="([^"]+)"/);
  if (match) return match[1];
  const match2 = html.match(/value="([^"]+)"[^>]*name="authenticity_token"/);
  return match2?.[1] || null;
}

function extractFormAction(html: string, formId?: string): string | null {
  let pattern: RegExp;
  if (formId) {
    pattern = new RegExp(`<form[^>]*id="${formId}"[^>]*action="([^"]+)"`, 'i');
  } else {
    pattern = /<form[^>]*action="([^"]+)"[^>]*method="post"/i;
  }
  const match = html.match(pattern);
  return match?.[1] || null;
}

function detectCurrentStep(html: string): string {
  const stepMatch = html.match(/data-step="([^"]+)"/);
  if (stepMatch) return stepMatch[1];
  if (html.includes('step="contact_information"') || html.includes('data-step="contact_information"'))
    return 'contact_information';
  if (html.includes('step="shipping_method"') || html.includes('data-step="shipping_method"'))
    return 'shipping_method';
  if (html.includes('step="payment_method"') || html.includes('data-step="payment_method"'))
    return 'payment_method';
  if (html.includes('step="processing"') || html.includes('step="thank_you"'))
    return 'complete';
  if (html.includes('Thank you') || html.includes('order-confirmation') || html.includes('os-order-number'))
    return 'complete';
  return 'unknown';
}

function extractShippingRateId(html: string): string | null {
  const match = html.match(/name="checkout\[shipping_rate\]\[id\]"[^>]*value="([^"]+)"/);
  if (match) return match[1];
  const match2 = html.match(/value="([^"]+)"[^>]*name="checkout\[shipping_rate\]\[id\]"/);
  if (match2) return match2[1];
  const match3 = html.match(/data-shipping-method="([^"]+)"/);
  if (match3) return match3[1];
  const match4 = html.match(/shipping_rate[^"]*"[^>]*value="([^"]+)"/);
  return match4?.[1] || null;
}

function extractPaymentGatewayId(html: string): string | null {
  const codMatch = html.match(/data-gateway-name="(manual|cash|cod)"[^>]*data-select-gateway="(\d+)"/i);
  if (codMatch) return codMatch[2];
  const codMatch2 = html.match(/data-select-gateway="(\d+)"[^>]*data-gateway-name="(manual|cash|cod)"/i);
  if (codMatch2) return codMatch2[1];
  const gatewayMatch = html.match(/name="checkout\[payment_gateway\]"[^>]*value="(\d+)"/);
  if (gatewayMatch) return gatewayMatch[1];
  const radioMatch = html.match(/data-select-gateway="(\d+)"/);
  return radioMatch?.[1] || null;
}

function extractOrderNumber(html: string): string | null {
  const match = html.match(/os-order-number[^>]*>.*?#(\d+)/s);
  if (match) return match[1];
  const match2 = html.match(/order_number[^>]*>.*?(\d+)/s);
  if (match2) return match2[1];
  const match3 = html.match(/#(\d{4,})/);
  return match3?.[1] || null;
}

async function followRedirects(url: string, jar: CookieJar, headers: Record<string, string>, maxRedirects = 10): Promise<{ url: string; html: string }> {
  let currentUrl = url;
  for (let i = 0; i < maxRedirects; i++) {
    const response = await fetch(currentUrl, {
      headers: { ...headers, Cookie: jar.toString() },
      redirect: 'manual',
    });
    jar.update(response.headers);

    const status = response.status;
    if (status >= 300 && status < 400) {
      const location = response.headers.get('location');
      if (!location) break;
      currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).toString();
      await response.text();
      continue;
    }

    const html = await response.text();
    return { url: currentUrl, html };
  }
  throw new Error('Too many redirects');
}

export async function autoCompleteCheckout(
  checkoutUrl: string,
  customer: CustomerData
): Promise<CheckoutResult> {
  const jar = new CookieJar();
  const baseHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
    'Accept-Encoding': 'identity',
    'Cache-Control': 'no-cache',
  };

  try {
    console.log('[AutoCheckout] Starting checkout automation...');
    console.log('[AutoCheckout] URL:', checkoutUrl);

    const step1 = await followRedirects(checkoutUrl, jar, baseHeaders);
    let html = step1.html;
    let currentUrl = step1.url;
    console.log('[AutoCheckout] Loaded page, length:', html.length);

    const authToken = extractAuthToken(html);
    if (!authToken) {
      console.log('[AutoCheckout] No authenticity_token found - SPA or non-standard checkout');
      return {
        success: false,
        redirectUrl: checkoutUrl,
        error: 'Could not parse checkout page',
      };
    }

    let step = detectCurrentStep(html);
    console.log('[AutoCheckout] Detected step:', step);

    const baseCheckoutUrl = currentUrl.split('?')[0];

    if (step === 'contact_information' || step === 'unknown') {
      console.log('[AutoCheckout] Submitting contact information...');

      let formattedPhone = customer.phone || '';
      formattedPhone = formattedPhone.replace(/\s+/g, '').replace(/-/g, '');
      if (formattedPhone.startsWith('07')) {
        formattedPhone = '+962' + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith('7') && formattedPhone.length === 9) {
        formattedPhone = '+962' + formattedPhone;
      } else if (formattedPhone && !formattedPhone.startsWith('+')) {
        formattedPhone = '+962' + formattedPhone;
      }

      const formData = new URLSearchParams();
      formData.append('_method', 'patch');
      formData.append('authenticity_token', authToken);
      formData.append('previous_step', 'contact_information');
      formData.append('step', 'shipping_method');
      formData.append('checkout[email]', customer.email);
      formData.append('checkout[buyer_accepts_marketing]', '0');
      formData.append('checkout[shipping_address][first_name]', customer.firstName);
      formData.append('checkout[shipping_address][last_name]', customer.lastName);
      formData.append('checkout[shipping_address][address1]', customer.address || '');
      formData.append('checkout[shipping_address][address2]', '');
      formData.append('checkout[shipping_address][city]', customer.city || 'Amman');
      formData.append('checkout[shipping_address][country]', 'JO');
      formData.append('checkout[shipping_address][province]', '');
      formData.append('checkout[shipping_address][zip]', '');
      formData.append('checkout[shipping_address][phone]', formattedPhone);
      formData.append('checkout[client_details][browser_width]', '412');
      formData.append('checkout[client_details][browser_height]', '915');
      formData.append('checkout[client_details][javascript_enabled]', '1');

      if (customer.notes) {
        formData.append('checkout[note]', customer.notes);
      }

      const contactResponse = await fetch(baseCheckoutUrl, {
        method: 'POST',
        headers: {
          ...baseHeaders,
          'Cookie': jar.toString(),
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': `https://${SHOPIFY_STORE_DOMAIN}`,
          'Referer': currentUrl,
        },
        body: formData.toString(),
        redirect: 'manual',
      });
      jar.update(contactResponse.headers);

      if (contactResponse.status >= 300 && contactResponse.status < 400) {
        const location = contactResponse.headers.get('location') || '';
        await contactResponse.text();
        const nextStep = await followRedirects(
          location.startsWith('http') ? location : new URL(location, baseCheckoutUrl).toString(),
          jar,
          baseHeaders
        );
        html = nextStep.html;
        currentUrl = nextStep.url;
      } else {
        html = await contactResponse.text();
      }

      step = detectCurrentStep(html);
      console.log('[AutoCheckout] After contact info, step:', step);

      if (step === 'contact_information' || step === 'unknown') {
        const errorMatch = html.match(/field__message[^>]*>([^<]+)/);
        const errorMsg = errorMatch ? errorMatch[1].trim() : 'Contact information rejected';
        console.log('[AutoCheckout] Contact info rejected:', errorMsg);
        return {
          success: false,
          redirectUrl: checkoutUrl,
          error: errorMsg,
        };
      }
    }

    if (step === 'shipping_method') {
      console.log('[AutoCheckout] Submitting shipping method...');

      const newAuthToken = extractAuthToken(html) || authToken;
      const shippingRateId = extractShippingRateId(html);

      console.log('[AutoCheckout] Shipping rate ID:', shippingRateId);

      const formData = new URLSearchParams();
      formData.append('_method', 'patch');
      formData.append('authenticity_token', newAuthToken);
      formData.append('previous_step', 'shipping_method');
      formData.append('step', 'payment_method');
      if (shippingRateId) {
        formData.append('checkout[shipping_rate][id]', shippingRateId);
      }
      formData.append('checkout[client_details][browser_width]', '412');
      formData.append('checkout[client_details][browser_height]', '915');
      formData.append('checkout[client_details][javascript_enabled]', '1');

      const shippingResponse = await fetch(baseCheckoutUrl, {
        method: 'POST',
        headers: {
          ...baseHeaders,
          'Cookie': jar.toString(),
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': `https://${SHOPIFY_STORE_DOMAIN}`,
          'Referer': currentUrl,
        },
        body: formData.toString(),
        redirect: 'manual',
      });
      jar.update(shippingResponse.headers);

      if (shippingResponse.status >= 300 && shippingResponse.status < 400) {
        const location = shippingResponse.headers.get('location') || '';
        await shippingResponse.text();
        const nextStep = await followRedirects(
          location.startsWith('http') ? location : new URL(location, baseCheckoutUrl).toString(),
          jar,
          baseHeaders
        );
        html = nextStep.html;
        currentUrl = nextStep.url;
      } else {
        html = await shippingResponse.text();
      }

      step = detectCurrentStep(html);
      console.log('[AutoCheckout] After shipping, step:', step);
    }

    if (step === 'payment_method') {
      console.log('[AutoCheckout] Processing payment step...');

      const newAuthToken = extractAuthToken(html) || authToken;
      const gatewayId = extractPaymentGatewayId(html);

      console.log('[AutoCheckout] Payment gateway ID:', gatewayId);

      const needsCardInfo = html.includes('card-fields-container') ||
                            html.includes('credit-card') ||
                            html.includes('data-gateway-group="direct"');
      const hasCodOption = html.toLowerCase().includes('cash on delivery') ||
                           html.toLowerCase().includes('الدفع عند الاستلام') ||
                           html.toLowerCase().includes('manual') ||
                           html.toLowerCase().includes('cod');

      if (!gatewayId) {
        console.log('[AutoCheckout] No payment gateway found, redirecting...');
        return {
          success: false,
          redirectUrl: currentUrl || checkoutUrl,
          error: 'No payment gateway found',
        };
      }

      const formData = new URLSearchParams();
      formData.append('_method', 'patch');
      formData.append('authenticity_token', newAuthToken);
      formData.append('previous_step', 'payment_method');
      formData.append('step', '');
      formData.append('s', '');
      formData.append('checkout[payment_gateway]', gatewayId);
      formData.append('checkout[credit_card][vault]', 'false');
      formData.append('checkout[different_billing_address]', 'false');
      formData.append('checkout[remember_me]', 'false');
      formData.append('checkout[remember_me]', '0');
      formData.append('checkout[vault_phone]', '');
      formData.append('checkout[total_price]', '');
      formData.append('complete', '1');
      formData.append('checkout[client_details][browser_width]', '412');
      formData.append('checkout[client_details][browser_height]', '915');
      formData.append('checkout[client_details][javascript_enabled]', '1');

      console.log('[AutoCheckout] Submitting payment form (gateway:', gatewayId, ')...');

      const paymentResponse = await fetch(baseCheckoutUrl, {
        method: 'POST',
        headers: {
          ...baseHeaders,
          'Cookie': jar.toString(),
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': `https://${SHOPIFY_STORE_DOMAIN}`,
          'Referer': currentUrl,
        },
        body: formData.toString(),
        redirect: 'manual',
      });
      jar.update(paymentResponse.headers);

      if (paymentResponse.status >= 300 && paymentResponse.status < 400) {
        const location = paymentResponse.headers.get('location') || '';
        await paymentResponse.text();

        if (location.includes('processing') || location.includes('thank_you') || location.includes('orders/')) {
          const finalPage = await followRedirects(
            location.startsWith('http') ? location : new URL(location, baseCheckoutUrl).toString(),
            jar,
            baseHeaders
          );
          html = finalPage.html;
          const orderNum = extractOrderNumber(html);
          console.log('[AutoCheckout] Order completed! Number:', orderNum);
          return {
            success: true,
            orderConfirmed: true,
            orderNumber: orderNum || undefined,
            redirectUrl: finalPage.url,
          };
        }

        const nextPage = await followRedirects(
          location.startsWith('http') ? location : new URL(location, baseCheckoutUrl).toString(),
          jar,
          baseHeaders
        );
        html = nextPage.html;
        currentUrl = nextPage.url;
        step = detectCurrentStep(html);

        if (step === 'complete' || html.includes('Thank you') || html.includes('os-order-number')) {
          const orderNum = extractOrderNumber(html);
          console.log('[AutoCheckout] Order completed! Number:', orderNum);
          return {
            success: true,
            orderConfirmed: true,
            orderNumber: orderNum || undefined,
            redirectUrl: currentUrl,
          };
        }

        return {
          success: false,
          redirectUrl: currentUrl,
          error: 'Payment requires additional information',
        };
      }

      html = await paymentResponse.text();
      step = detectCurrentStep(html);

      if (step === 'complete' || html.includes('Thank you') || html.includes('os-order-number')) {
        const orderNum = extractOrderNumber(html);
        console.log('[AutoCheckout] Order completed! Number:', orderNum);
        return {
          success: true,
          orderConfirmed: true,
          orderNumber: orderNum || undefined,
        };
      }

      if (step === 'payment_method') {
        const errorMatch = html.match(/notice--error[^>]*>([^<]+)/);
        const errorMsg = errorMatch ? errorMatch[1].trim() : '';
        console.log('[AutoCheckout] Payment step returned error:', errorMsg);
        return {
          success: false,
          redirectUrl: currentUrl || checkoutUrl,
          error: errorMsg || 'Payment requires additional information',
        };
      }
    }

    if (step === 'complete' || html.includes('Thank you') || html.includes('os-order-number')) {
      const orderNum = extractOrderNumber(html);
      console.log('[AutoCheckout] Order already complete! Number:', orderNum);
      return {
        success: true,
        orderConfirmed: true,
        orderNumber: orderNum || undefined,
      };
    }

    return {
      success: false,
      redirectUrl: currentUrl || checkoutUrl,
      error: 'Checkout requires additional interaction',
    };

  } catch (error: any) {
    console.error('[AutoCheckout] Error:', error.message);
    return {
      success: false,
      redirectUrl: checkoutUrl,
      error: error.message,
    };
  }
}
