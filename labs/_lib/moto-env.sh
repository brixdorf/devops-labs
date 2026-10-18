#!/bin/bash
# Points the AWS CLI conventions (and the Terraform AWS provider) at Moto.
# Source it from a setup script: . "$LAB_DIR/lib/moto-env.sh"
cat > /etc/profile.d/aws-moto.sh <<'END'
# Local AWS stand-in for the cloud labs. These are fake credentials for Moto.
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1
export AWS_ENDPOINT_URL=http://moto:5000
END
chmod 644 /etc/profile.d/aws-moto.sh
for _ in $(seq 1 30); do curl -sf http://moto:5000/moto-api/ >/dev/null && break; sleep 1; done
curl -sf -X POST http://moto:5000/moto-api/recorder/start-recording >/dev/null
