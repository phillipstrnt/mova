const EMAIL_LOCAL_PART = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const EMAIL_DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const isValidEmail = (value) => {
  const email = typeof value === "string" ? value.trim() : "";
  if (!email || email.length > 254) return false;

  const atIndex = email.lastIndexOf("@");
  if (atIndex < 1 || atIndex !== email.indexOf("@")) return false;

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (localPart.length > 64 || !EMAIL_LOCAL_PART.test(localPart)) return false;

  const labels = domain.split(".");
  if (labels.length < 2 || labels.some((label) => !EMAIL_DOMAIN_LABEL.test(label))) {
    return false;
  }

  return labels.at(-1).length >= 2;
};
