export class ForbiddenError extends Error {
  constructor() {
    super("forbidden");
    this.name = "ForbiddenError";
  }
}

export function isAdminEmail(email: string | null | undefined, adminEmails: string[]): boolean {
  return !!email && adminEmails.includes(email.trim().toLowerCase());
}

export function assertAdmin(email: string | null | undefined, adminEmails: string[]): string {
  if (!email || !isAdminEmail(email, adminEmails)) throw new ForbiddenError();
  return email.trim().toLowerCase();
}
