<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Activation codes are redeemed and generated only through SECURITY DEFINER SQL functions (`redeem_access_code`, `admin_generate_codes`); a trigger makes burned codes immutable so a used code can never be reused.
- Owner access is a row in `user_roles` claimed once via `claim_first_admin`; never derive admin from profile fields or client storage.
- The writing assistant runs in the `/api/assist` server route, which verifies the bearer token, active subscription and daily limit before calling the AI gateway.
