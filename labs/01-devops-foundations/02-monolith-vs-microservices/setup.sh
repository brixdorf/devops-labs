#!/bin/bash
# Writes the use case plus shuffled statements and traits.
set -euo pipefail
dir=/home/user/architecture
mkdir -p "$dir"
cat > "$dir/usecase.md" <<'END'
# ShopSphere

ShopSphere sells electronics online. One Java application contains five modules:
catalog, cart, payments, orders and notifications. All modules share one database.

- Black Friday traffic is 20 times higher than normal, mostly on the catalog.
- A memory leak in the notifications module took the whole site down last month.
- Every release, even a one-line cart fix, redeploys the entire application.
END
statements=(
  "benefit|Each service can be deployed on its own, so a cart fix does not need a full site release."
  "benefit|A busy service, such as the catalog during a sale, can be scaled without scaling everything else."
  "benefit|A failure in one service, such as notifications, can be isolated so the rest of the shop keeps working."
  "challenge|Calls between services go over the network, which adds latency and new ways to fail."
  "challenge|Tracing one customer request across many services needs centralized logging and tracing."
  "challenge|Keeping data consistent across services, for example orders and payments, is harder without one shared transaction."
  "false|Microservices remove the need for monitoring because each service is small."
  "false|Microservices always cost less to run than a monolith."
  "false|Every microservice must use the same database and the same programming language."
)
traits=(
  "monolith|One deployable artifact for the whole shop."
  "monolith|A bug in payments can crash the whole application process."
  "monolith|All modules share one database schema."
  "microservices|Teams release their service on their own schedule."
  "microservices|Components talk to each other through network APIs."
  "microservices|Each service can use the technology that suits it."
)
write_list() {
  local prefix=$1 file=$2; shift 2
  local items=("$@") json="{" n=1
  : > "$file"
  for i in $(printf '%s\n' "${!items[@]}" | shuf); do
    echo "$prefix$n: ${items[$i]#*|}" >> "$file"
    json+="\"$prefix$n\": \"${items[$i]%%|*}\", "
    n=$((n + 1))
  done
  echo "${json%, }}"
}
s_json=$(write_list S "$dir/statements.txt" "${statements[@]}")
t_json=$(write_list T "$dir/traits.txt" "${traits[@]}")
chown -R user:user "$dir"
printf '{"statements": %s, "traits": %s}\n' "$s_json" "$t_json" > "$LAB_CONTEXT_FILE"
