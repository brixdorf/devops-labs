## Objective

In **GitOps**, a Git repository holds the desired state of the cluster, and a controller keeps the cluster in line with it. Nobody runs `kubectl apply` for releases: you change Git, and the controller does the rest. **Argo CD** is that controller here. You will connect it to a repository, let it deploy an application, then scale the application by changing a number in Git.

- Argo CD: {{ARGOCD_URL}} (or **Open Argo CD**), user `{{ARGOCD_USER}}`, password `{{ARGOCD_PASSWORD}}`
- Gitea: {{GITEA_URL}}, user `{{GITEA_USER}}`, password `{{GITEA_PASSWORD}}`
- The repository `{{GITEA_USER}}/gitops-demo` holds the manifests of the `web` application in `apps/web/`. It is cloned to `/home/user/gitops-demo` (credentials saved). Inside the cluster, Argo CD reaches it at `http://gitea:3000/{{GITEA_USER}}/gitops-demo.git`.

## Tasks

### Task 1: Create the Argo CD Application

Create an Argo CD Application named `web` (in the `argocd` namespace), either in the Argo CD web interface (**New App**) or with a manifest and `kubectl apply`:

- source: repository `http://gitea:3000/{{GITEA_USER}}/gitops-demo.git`, revision `main`, path `apps/web`
- destination: the local cluster (`https://kubernetes.default.svc`), namespace `web`
- sync policy: **automatic**, with **prune** and **self heal** enabled, and the sync option to create the namespace

### Task 2: Verify the first sync

Wait until the Application is **Synced** and **Healthy**, and check that the Deployment `web` in the namespace `web` runs 2 replicas.

### Task 3: Change the desired state in Git

In `/home/user/gitops-demo/apps/web/deployment.yaml`, change `replicas: 2` to `replicas: 4`. Commit and push to `main`. Do **not** change the cluster directly.

### Task 4: Watch the reconciliation

Argo CD checks the repository every 20 seconds. Wait until the Deployment runs 4 ready replicas and the Application is Synced to your new commit. Save the commit ID that Argo CD synced (shown in the Application details, or `kubectl -n argocd get application web -o jsonpath='{.status.sync.revision}'`) to `/home/user/gitops-demo-revision.txt`.

## Notes

- Self heal means Argo CD also undoes manual changes: if you scale the Deployment with kubectl, it goes back to what Git says.

## Expected outcome

The `web` Application syncs automatically from Git, and changing the replica count in Git scaled the Deployment to 4 without anyone touching the cluster.
