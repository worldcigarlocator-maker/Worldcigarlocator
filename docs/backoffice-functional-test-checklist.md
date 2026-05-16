# Backoffice Functional Test Checklist

Status: owner test required.

Use this checklist after syncing/pulling the latest PR branch.

## Goal

Confirm the remaining admin flows work after the Supabase security fixes.

## Safe Test Setup

Use test listings so real stores are not affected.

Suggested names:

- `WCL TEST APPROVE`
- `WCL TEST REJECT`

Create them through the normal Add Listing flow so they land in Pending.

## Test 1: Backoffice Read

1. Open Backoffice.
2. Confirm the approved/list cards load.
3. Open Pending.
4. Confirm the two test listings are visible.
5. Open Trash/Deleted if available.
6. Confirm the page loads without console errors.

Expected result:

- Backoffice loads stores and pending rows.
- No permission error appears.

## Test 2: Approve Pending

1. In Pending, find `WCL TEST APPROVE`.
2. Click Approve.
3. Confirm it disappears from Pending.
4. Go to Approved/List.
5. Confirm the approved test listing appears.

Expected result:

- Pending row moves into real stores.
- No other store is affected.

## Test 3: Edit Approved Store

1. Open Edit on `WCL TEST APPROVE`.
2. Make a tiny harmless change, for example add ` TEST` to the address or phone field.
3. Click Save.
4. Re-open Edit and confirm the change is still there.

Expected result:

- Save works.
- No permission error appears.

## Test 4: Delete / Restore

1. On `WCL TEST APPROVE`, click Delete.
2. Confirm it moves to Trash/Deleted.
3. Restore it.
4. Confirm it returns.
5. Delete it again if you want to keep the public site clean.

Expected result:

- Delete and restore affect only the selected test listing.

## Test 5: Reject Pending

1. In Pending, find `WCL TEST REJECT`.
2. Click Reject Pending.
3. Confirm it disappears from Pending.
4. Confirm no real store was moved to Trash.

Expected result:

- Pending row is removed.
- No real store is affected.

## If Anything Fails

Send:

- what button you clicked;
- what happened on screen;
- any console error text or screenshot.
