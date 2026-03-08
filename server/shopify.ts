const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '';
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || '';
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '';

export async function shopifyAdminFetch(endpoint: string, method: string = 'GET', body?: any) {
  let adminDomain = SHOPIFY_STORE_DOMAIN;
  if (!adminDomain.includes('.myshopify.com')) {
    adminDomain = await resolveShopifyAdminDomain(adminDomain);
  }
  const url = `https://${adminDomain}/admin/api/2024-01/${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    fetchOptions.body = JSON.stringify(body);
  }

  console.log(`[Admin API] ${method} ${url}`);

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify Admin API error: ${response.status} - ${text}`);
  }

  return response.json();
}

export async function shopifyAdminGraphQL(query: string, variables?: any): Promise<any> {
  let adminDomain = SHOPIFY_STORE_DOMAIN;
  if (!adminDomain.includes('.myshopify.com')) {
    adminDomain = await resolveShopifyAdminDomain(adminDomain);
  }
  const url = `https://${adminDomain}/admin/api/2024-01/graphql.json`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify Admin GraphQL error: ${response.status} - ${text}`);
  }
  const json = await response.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

// Fetch all pages of a list endpoint (handles Link header pagination)
export async function shopifyAdminFetchPaged(baseEndpoint: string, itemsKey: string): Promise<any[]> {
  let adminDomain = SHOPIFY_STORE_DOMAIN;
  if (!adminDomain.includes('.myshopify.com')) {
    adminDomain = await resolveShopifyAdminDomain(adminDomain);
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
  };
  const sep = baseEndpoint.includes('?') ? '&' : '?';
  let url = `https://${adminDomain}/admin/api/2024-01/${baseEndpoint}${sep}limit=250`;
  const all: any[] = [];
  while (url) {
    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) break;
    const data = await response.json();
    const items = data[itemsKey] || [];
    all.push(...items);
    const linkHeader = response.headers.get('Link') || '';
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : '';
  }
  return all;
}

let _resolvedAdminDomain: string | null = null;
async function resolveShopifyAdminDomain(domain: string): Promise<string> {
  if (_resolvedAdminDomain) return _resolvedAdminDomain;
  try {
    const res = await fetch(`https://${domain}/admin/api/2024-01/shop.json`, {
      method: 'GET',
      headers: { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN },
      redirect: 'manual',
    });
    const location = res.headers.get('location');
    if (location) {
      const match = location.match(/https:\/\/([^/]+)\//);
      if (match) {
        _resolvedAdminDomain = match[1];
        console.log(`[Admin API] Resolved admin domain: ${_resolvedAdminDomain}`);
        return _resolvedAdminDomain;
      }
    }
  } catch (e) {}
  _resolvedAdminDomain = domain;
  return domain;
}

export function extractNumericId(gid: string): string {
  const match = gid.match(/(\d+)$/);
  return match ? match[1] : gid;
}

export async function shopifyFetch(query: string, variables: Record<string, unknown> = {}) {
  let storefrontDomain = SHOPIFY_STORE_DOMAIN;
  if (!storefrontDomain.includes('.myshopify.com')) {
    storefrontDomain = await resolveShopifyAdminDomain(storefrontDomain);
  }
  const url = `https://${storefrontDomain}/api/2024-01/graphql.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API error: ${response.status} - ${text}`);
  }

  const json = await response.json();

  if (json.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

export const QUERIES = {
  COLLECTIONS: `
    query GetCollections($first: Int!, $query: String, $language: LanguageCode) @inContext(language: $language) {
      collections(first: $first, query: $query) {
        edges {
          node {
            id
            title
            handle
            description
            image {
              url
              altText
            }
          }
        }
      }
    }
  `,

  COLLECTION_PRODUCTS: `
    query GetCollectionProducts($handle: String!, $first: Int!, $after: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean, $filters: [ProductFilter!], $language: LanguageCode) @inContext(language: $language) {
      collection(handle: $handle) {
        id
        title
        handle
        description
        products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, filters: $filters) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              description
              descriptionHtml
              productType
              vendor
              availableForSale
              compareAtPriceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 5) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    availableForSale
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `,

  PRODUCTS: `
    query GetProducts($first: Int!, $after: String, $sortKey: ProductSortKeys, $reverse: Boolean, $query: String, $language: LanguageCode) @inContext(language: $language) {
      products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            title
            handle
            description
            descriptionHtml
            productType
            vendor
            availableForSale
            compareAtPriceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 5) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  price {
                    amount
                    currencyCode
                  }
                  compareAtPrice {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `,

  PRODUCT_BY_HANDLE: `
    query GetProductByHandle($handle: String!, $language: LanguageCode) @inContext(language: $language) {
      product(handle: $handle) {
        id
        title
        handle
        description
        descriptionHtml
        productType
        vendor
        availableForSale
        tags
        compareAtPriceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 50) {
          edges {
            node {
              url
              altText
            }
          }
        }
        ratingValue: metafield(namespace: "reviews", key: "rating") {
          value
        }
        ratingCount: metafield(namespace: "reviews", key: "rating_count") {
          value
        }
        variants(first: 30) {
          edges {
            node {
              id
              title
              sku
              availableForSale
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
              image {
                url
                altText
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
  `,

  SEARCH_PRODUCTS: `
    query SearchProducts($query: String!, $first: Int!, $language: LanguageCode) @inContext(language: $language) {
      products(first: $first, query: $query) {
        edges {
          node {
            id
            title
            handle
            vendor
            productType
            tags
            description
            availableForSale
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            compareAtPriceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `,

  VENDOR_PRODUCTS: `
    query GetVendorProducts($first: Int!, $query: String!) {
      products(first: $first, query: $query) {
        edges {
          node {
            vendor
            featuredImage { url }
            images(first: 1) { edges { node { url } } }
            metafield(namespace: "brand", key: "logo") {
              reference {
                ... on MediaImage {
                  image { url }
                }
              }
            }
          }
        }
      }
    }
  `,

  GET_CART: `
    query GetCart($cartId: ID!) {
      cart(id: $cartId) {
        id
        checkoutUrl
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 50) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    title
                    handle
                    vendor
                    images(first: 1) {
                      edges {
                        node {
                          url
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        discountCodes {
          code
          applicable
        }
      }
    }
  `,

  CREATE_CART: `
    mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      vendor
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  ADD_TO_CART: `
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      vendor
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  UPDATE_CART_LINES: `
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      vendor
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  REMOVE_CART_LINES: `
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      vendor
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  APPLY_DISCOUNT: `
    mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
      cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
          discountCodes {
            code
            applicable
          }
          discountAllocations {
            discountedAmount {
              amount
              currencyCode
            }
            ... on CartCodeDiscountAllocation {
              code
            }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                cost {
                  totalAmount {
                    amount
                    currencyCode
                  }
                  subtotalAmount {
                    amount
                    currencyCode
                  }
                  amountPerQuantity {
                    amount
                    currencyCode
                  }
                  compareAtAmountPerQuantity {
                    amount
                    currencyCode
                  }
                }
                discountAllocations {
                  discountedAmount {
                    amount
                    currencyCode
                  }
                  ... on CartCodeDiscountAllocation {
                    code
                  }
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      vendor
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  CART_BUYER_IDENTITY_UPDATE: `
    mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
      cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
        cart {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      vendor
                      images(first: 1) {
                        edges {
                          node {
                            url
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  CART_NOTE_UPDATE: `
    mutation cartNoteUpdate($cartId: ID!, $note: String!) {
      cartNoteUpdate(cartId: $cartId, note: $note) {
        cart {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  CHECKOUT_CREATE: `
    mutation checkoutCreate($input: CheckoutCreateInput!) {
      checkoutCreate(input: $input) {
        checkout {
          id
          webUrl
          totalPriceV2 {
            amount
            currencyCode
          }
          lineItems(first: 50) {
            edges {
              node {
                title
                quantity
                variant {
                  id
                  title
                  priceV2 {
                    amount
                    currencyCode
                  }
                  product {
                    title
                  }
                }
              }
            }
          }
        }
        checkoutUserErrors {
          code
          field
          message
        }
      }
    }
  `,

  CHECKOUT_SHIPPING_ADDRESS_UPDATE: `
    mutation checkoutShippingAddressUpdateV2($checkoutId: ID!, $shippingAddress: MailingAddressInput!) {
      checkoutShippingAddressUpdateV2(checkoutId: $checkoutId, shippingAddress: $shippingAddress) {
        checkout {
          id
          webUrl
        }
        checkoutUserErrors {
          code
          field
          message
        }
      }
    }
  `,

  CHECKOUT_EMAIL_UPDATE: `
    mutation checkoutEmailUpdateV2($checkoutId: ID!, $email: String!) {
      checkoutEmailUpdateV2(checkoutId: $checkoutId, email: $email) {
        checkout {
          id
        }
        checkoutUserErrors {
          code
          field
          message
        }
      }
    }
  `,

  CUSTOMER_CREATE: `
    mutation CustomerCreate($input: CustomerCreateInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
          firstName
          lastName
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,

  CUSTOMER_ACCESS_TOKEN_CREATE: `
    mutation CustomerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,

  CUSTOMER_RECOVER: `
    mutation CustomerRecover($email: String!) {
      customerRecover(email: $email) {
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,

  GET_CUSTOMER: `
    query GetCustomer($customerAccessToken: String!, $language: LanguageCode) @inContext(language: $language) {
      customer(customerAccessToken: $customerAccessToken) {
        id
        email
        firstName
        lastName
        phone
        defaultAddress {
          id
        }
        addresses(first: 20) {
          edges {
            node {
              id
              address1
              address2
              city
              company
              country
              firstName
              lastName
              phone
              province
              zip
            }
          }
        }
        orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
          edges {
            node {
              id
              name
              orderNumber
              processedAt
              canceledAt
              financialStatus
              fulfillmentStatus
              statusUrl
              totalPrice {
                amount
                currencyCode
              }
              subtotalPrice {
                amount
                currencyCode
              }
              totalShippingPrice {
                amount
                currencyCode
              }
              totalTax {
                amount
                currencyCode
              }
              currentTotalPrice {
                amount
                currencyCode
              }
              shippingAddress {
                city
                address1
                phone
                firstName
                lastName
              }
          lineItems(first: 100) {
            edges {
              node {
                title
                quantity
                originalTotalPrice {
                  amount
                  currencyCode
                }
                variant {
                  id
                  title
                  availableForSale
                  image {
                    url
                  }
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    handle
                  }
                }
              }
            }
          }
            }
          }
        }
      }
    }
  `,

  CUSTOMER_UPDATE: `
    mutation CustomerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
      customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
        customer {
          id
          email
          firstName
          lastName
          phone
        }
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `,

  PRODUCT_RECOMMENDATIONS: `
    query GetProductRecommendations($productId: ID!, $language: LanguageCode) @inContext(language: $language) {
      productRecommendations(productId: $productId) {
        id
        title
        handle
        vendor
        availableForSale
        productType
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        compareAtPriceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 1) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 1) {
          edges {
            node {
              id
              title
              availableForSale
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `,
};

export const ADMIN_QUERIES = {
  COLLECTIONS: `
    query GetCollections($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            id
            title
            handle
            description
            image { url altText }
          }
        }
      }
    }
  `,
  COLLECTION_PRODUCTS: `
    query GetCollectionProducts($query: String!, $first: Int!, $after: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean) {
      collections(first: 1, query: $query) {
        edges {
          node {
            id
            title
            handle
            description
            products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
              pageInfo { hasNextPage endCursor }
              edges {
                node {
                  id title handle description descriptionHtml productType vendor
                  priceRangeV2 { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
                  images(first: 5) { edges { node { url altText } } }
                  variants(first: 10) {
                    edges { node { id title availableForSale price compareAtPrice } }
                  }
                }
              }
            }
          }
        }
      }
    }
  `,
  PRODUCTS: `
    query GetProducts($first: Int!, $after: String, $sortKey: ProductSortKeys, $reverse: Boolean, $query: String) {
      products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id title handle description descriptionHtml productType vendor
            priceRangeV2 { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
            images(first: 5) { edges { node { url altText } } }
            variants(first: 10) {
              edges { node { id title availableForSale price compareAtPrice } }
            }
          }
        }
      }
    }
  `,
  PRODUCT_BY_HANDLE: `
    query GetProductByHandle($query: String!) {
      products(first: 1, query: $query) {
        edges {
          node {
            id title handle description descriptionHtml productType vendor tags
            priceRangeV2 { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
            images(first: 50) { edges { node { url altText } } }
            ratingValue: metafield(namespace: "reviews", key: "rating") { value }
            ratingCount: metafield(namespace: "reviews", key: "rating_count") { value }
            variants(first: 30) {
              edges { node { id title availableForSale price compareAtPrice image { url altText } selectedOptions { name value } } }
            }
          }
        }
      }
    }
  `,
  SEARCH_PRODUCTS: `
    query SearchProducts($query: String!, $first: Int!) {
      products(first: $first, query: $query) {
        edges {
          node {
            id title handle vendor productType tags description
            priceRangeV2 { minVariantPrice { amount currencyCode } }
            images(first: 1) { edges { node { url altText } } }
            variants(first: 1) { edges { node { id title availableForSale price compareAtPrice } } }
          }
        }
      }
    }
  `,
};

export function mapAdminProduct(p: any): any {
  const currencyCode = p.priceRangeV2?.minVariantPrice?.currencyCode || 'JOD';
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    description: p.description,
    descriptionHtml: p.descriptionHtml,
    productType: p.productType,
    vendor: p.vendor,
    tags: p.tags || [],
    availableForSale: p.variants?.edges?.some((e: any) => e.node.availableForSale) ?? true,
    priceRange: p.priceRangeV2 || { minVariantPrice: { amount: '0', currencyCode }, maxVariantPrice: { amount: '0', currencyCode } },
    compareAtPriceRange: (() => {
      const compareAtPrices = (p.variants?.edges || [])
        .map((e: any) => e.node.compareAtPrice ? parseFloat(e.node.compareAtPrice) : null)
        .filter((v: any) => v !== null && !isNaN(v));
      if (compareAtPrices.length === 0) return { minVariantPrice: null };
      const minCat = Math.min(...compareAtPrices);
      return { minVariantPrice: { amount: String(minCat), currencyCode } };
    })(),
    images: p.images,
    ratingValue: p.ratingValue,
    ratingCount: p.ratingCount,
    variants: {
      edges: (p.variants?.edges || []).map((e: any) => ({
        node: {
          id: e.node.id,
          title: e.node.title,
          availableForSale: e.node.availableForSale,
          image: e.node.image,
          selectedOptions: e.node.selectedOptions,
          price: { amount: String(e.node.price || '0'), currencyCode },
          compareAtPrice: e.node.compareAtPrice ? { amount: String(e.node.compareAtPrice), currencyCode } : null,
        }
      }))
    }
  };
}
