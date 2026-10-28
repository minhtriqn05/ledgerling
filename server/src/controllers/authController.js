import * as authService from "../services/authService.js";

// Controllers only translate between HTTP and the service. Express 5 forwards
// errors thrown in async handlers to errorHandler, so no try/catch is needed.

export async function register(req, res) {
  const data = await authService.register(req.body);
  res.status(201).json({ success: true, data });
}

export async function me(req, res) {
  const user = await authService.getCurrentUser(req.user.id);
  res.status(200).json({ success: true, data: user });
}

export async function login(req, res) {
  const data = await authService.login(req.body);
  res.status(200).json({ success: true, data });
}
