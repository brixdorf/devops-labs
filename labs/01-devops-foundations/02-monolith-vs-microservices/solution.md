The statements are numbered in a random order for every lab session, so pick them by meaning.

**Benefits** (choose any two):

- Each service can be deployed on its own, so a cart fix does not need a full site release.
- A busy service, such as the catalog during a sale, can be scaled without scaling everything else.
- A failure in one service, such as notifications, can be isolated so the rest of the shop keeps working.

**Challenges** (choose any two):

- Calls between services go over the network, which adds latency and new ways to fail.
- Tracing one customer request across many services needs centralized logging and tracing.
- Keeping data consistent across services (for example orders and payments) is harder without one shared transaction.

**False statements** (never choose): microservices remove the need for monitoring, always cost less to run, or require every service to use the same database and language.

**Traits:**

| Trait | Architecture |
| --- | --- |
| One deployable artifact for the whole shop | monolith |
| A bug in payments can crash the whole application process | monolith |
| All modules share one database schema | monolith |
| Teams release their service on their own schedule | microservices |
| Components talk to each other through network APIs | microservices |
| Each service can use the technology that suits it | microservices |

Example (your IDs will differ):

```bash
cd /home/user/architecture
printf 'S3\nS7\n' > benefits.txt
printf 'S1\nS5\n' > challenges.txt
nano traits-answer.txt
```
