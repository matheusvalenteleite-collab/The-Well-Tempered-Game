import sys
from remotezip import RemoteZip
url="https://zenodo.org/records/1442513/files/VocalSet11.zip?download=1"
out=sys.argv[1]; names=sys.argv[2:]
with RemoteZip(url, verify="/root/.ccr/ca-bundle.crt") as z:
    for n in names:
        z.extract(n, out); print("ok", n)
