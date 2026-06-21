import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthed = Boolean(req.auth?.user);
  const isAuthPage = nextUrl.pathname === "/login" || nextUrl.pathname === "/register";
  const isAdmin = nextUrl.pathname.startsWith("/admin");

  if (!isAuthed && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isAuthed && isAuthPage) {
    return NextResponse.redirect(new URL(req.auth?.user.role === "admin" ? "/admin/dashboard" : "/dashboard", nextUrl));
  }

  if (isAdmin && req.auth?.user.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|uploads).*)"],
};
