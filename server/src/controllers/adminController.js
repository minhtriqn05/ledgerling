import * as adminService from "../services/adminService.js";

export async function stats(req, res) {
  const data = await adminService.getStats();
  res.status(200).json({ success: true, data });
}

export async function users(req, res) {
  const { users: data, meta } = await adminService.listUsers(req.listQuery);
  res.status(200).json({ success: true, data, meta });
}

export async function setStatus(req, res) {
  const data = await adminService.setUserStatus(req.user.id, req.params.id, req.body.status);
  res.status(200).json({ success: true, data });
}
