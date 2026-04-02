export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Amazon Associate Tag (replace XXXXX with your actual associate ID)
export const AMAZON_TAG = "XXXXX-22";

// Amazon affiliate links for each supplement
export const SUPPLEMENT_AMAZON_URLS: Record<string, string> = {
  "ビタミンD3": `https://www.amazon.co.jp/s?k=ビタミンD3+2000IU+サプリ&tag=${AMAZON_TAG}`,
  "キレート鉄（ビスグリシン酸鉄）": `https://www.amazon.co.jp/s?k=キレート鉄+ビスグリシン酸鉄+サプリ&tag=${AMAZON_TAG}`,
  "オメガ3（EPA/DHA）": `https://www.amazon.co.jp/s?k=オメガ3+EPA+DHA+サプリ&tag=${AMAZON_TAG}`,
  "マグネシウム（グリシン酸）": `https://www.amazon.co.jp/s?k=マグネシウム+グリシン酸+サプリ&tag=${AMAZON_TAG}`,
  "ビタミンK2（MK-7）": `https://www.amazon.co.jp/s?k=ビタミンK2+MK-7+サプリ&tag=${AMAZON_TAG}`,
};

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
