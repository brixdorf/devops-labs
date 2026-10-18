## Objective

Hard-coded values make a configuration useful for exactly one situation. **Input variables** let the same code serve every environment, a **.tfvars** file holds the values for one environment, and **outputs** print the useful results after an apply. You will parameterize a small configuration and apply it for a staging environment.

## Tasks

Work in `/home/user/tf/app-config` (create it).

### Task 1: Declare the variables

In `variables.tf`, declare three variables, each with a `type` and a `description`:

| Name | Type | Default |
| --- | --- | --- |
| `environment` | `string` | none (required) |
| `owner` | `string` | none (required) |
| `replicas` | `number` | `1` |

### Task 2: Use them

In `main.tf`, using the `random` and `local` providers:

- a `random_pet` resource named `app` with `prefix = var.environment`
- a `local_file` resource named `config` that writes `${path.module}/app.conf` with exactly these four lines:

```
environment=<environment>
owner=<owner>
replicas=<replicas>
app_name=<the random_pet id>
```

### Task 3: Add outputs

In `outputs.tf`, declare:

- `app_name`: the `random_pet` id
- `config_path`: the `filename` of the `local_file`

### Task 4: Apply with a tfvars file

Create `staging.tfvars` with `environment = "staging"`, `owner = "platform-team"` and `replicas = 3`. Initialize, then apply with that file. Do not type the values on the command line.

### Task 5: Use an output

Save the value of the `app_name` output, without quotes, to `/home/user/tf/app-config/app-name.txt`.

## Notes

- `terraform output -raw NAME` prints an output's value without quotes.

## Expected outcome

The configuration is applied with the staging values from `staging.tfvars`, `app.conf` contains them, and the outputs show the generated app name and the config path.
