// Authorization belongs to the API: callers pass only the verified Auth user ID.
export async function claimVm(db, userId) {
  const { data, error } = await db
    .schema("mao")
    .rpc("claim_vm", { p_user_id: userId });
  if (error) {
    console.error("VM assignment failed", error);
    throw Error(
      "Unable to assign a desktop. Check that the VM pool database setup has been applied.",
    );
  }
  if (data !== null && (!Number.isSafeInteger(data) || data < 1))
    throw Error("Invalid desktop assignment returned by database");
  return data;
}
