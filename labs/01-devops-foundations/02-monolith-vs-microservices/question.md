## Scenario

ShopSphere is an online shopping site. Today it is one large application (a monolith) that contains the product catalog, the shopping cart, payments, orders and email notifications. The team is considering splitting it into microservices. Before deciding, they want a clear comparison.

Everything you need is in `/home/user/architecture/`:

- `usecase.md` describes ShopSphere.
- `statements.txt` contains numbered statements (`S1`, `S2`, ...) about microservices. Some describe real operational **benefits**, some describe real operational **challenges**, and some are **false**.
- `traits.txt` contains numbered traits (`T1`, `T2`, ...), each describing either a monolith or a microservices architecture.

## Tasks

### Task 1: Two operational benefits

Create `/home/user/architecture/benefits.txt` with the IDs of **two** statements that are real operational benefits of microservices, one ID per line.

### Task 2: Two operational challenges

Create `/home/user/architecture/challenges.txt` with the IDs of **two** statements that are real operational challenges of microservices, one ID per line.

### Task 3: Classify the traits

Create `/home/user/architecture/traits-answer.txt` with one line per trait in `traits.txt`, in the form `ID=monolith` or `ID=microservices`, for example:

```
T1=monolith
```

## Notes

- Do not pick a false statement in Task 1 or Task 2.
- Use exactly two IDs in each of `benefits.txt` and `challenges.txt`.

## Expected outcome

Three answer files that identify two benefits, two challenges and the architecture each trait belongs to.
