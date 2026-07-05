import "express-session";

declare module "express-session" {
  interface SessionData {
    user_info: {
      id: string;
      email: string;
    };
  }
}
