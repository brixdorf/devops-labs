1. Add the upload step at the end of the job, commit and push.
2. Wait for the run to finish; the run page shows the artifact.
3. List the artifacts with the API, take the newest `calculator` artifact ID, and download the zip with `curl -L -o`.
4. Unzip, run the app, save the output.
