"""Your identity, kept between runs.

The keypair is the operator. Generate a new one every run and the registry will
refuse the second registration, because a different key is asking for a name
that is already claimed. So the first run creates a keypair and saves it next to
this file; every run after that loads it.

This is the same thing you will do in production, just with a file instead of a
secrets manager.
"""

import json
import base64
import os
import sys

from getstub import Stub

HERE = os.path.dirname(os.path.abspath(__file__))
KEYFILE = os.path.join(HERE, ".stub-keys.json")


def _require_operator_id(suggestion):
    operator_id = os.environ.get("STUB_OPERATOR_ID")
    if operator_id:
        return operator_id
    sys.stderr.write(
        "\nSet STUB_OPERATOR_ID first. It is your name on the registry, and it has to be\n"
        "yours rather than one shared by everyone who clones this.\n\n"
        "  export STUB_OPERATOR_ID=%s\n\n"
        "Pick anything unclaimed. Your first run registers it and saves the keypair to\n"
        ".stub-keys.json in this folder, which is gitignored.\n\n" % suggestion
    )
    sys.exit(1)



def _normalise_keypair(kp):
    """Accept a keypair exported by either client.

    The Python client stores the raw Ed25519 private bytes; the JavaScript one
    stores a JWK. They are the same 32 bytes in different wrappers, so one
    identity should work from either language. This converts the JWK form,
    where `d` is the private key base64url encoded.
    """
    if "private_raw_b64" in kp:
        return kp
    d = kp.get("privateKey", {}).get("d")
    if not d:
        raise ValueError(
            "STUB_KEYPAIR is not a keypair this client recognises. Expected either "
            "{'private_raw_b64': ...} from getstub, or the JWK form from @getstub/agent."
        )
    raw = base64.urlsafe_b64decode(d + "=" * (-len(d) % 4))
    return {"private_raw_b64": base64.b64encode(raw).decode()}


def get_stub(operator, suggestion, declared, salt):
    """Return a Stub client with a stable identity across runs."""
    operator_id = _require_operator_id(suggestion)
    kwargs = dict(
        operator=operator,
        operator_id=operator_id,
        declared=declared,
        principal_salt=os.environ.get("STUB_SALT", salt),
        registry=os.environ.get("STUB_REGISTRY", "https://api.getstub.dev"),
    )
    stub = Stub(**kwargs)

    # A keypair in the environment wins over one on disk. This is the shape a
    # real deployment uses, where the key comes from a secrets manager rather
    # than a file next to the code, and it is what lets this run in CI without
    # writing a private key onto a build machine.
    if os.environ.get("STUB_KEYPAIR"):
        stub.load_keypair(_normalise_keypair(json.loads(os.environ["STUB_KEYPAIR"])))
        return stub

    if os.path.exists(KEYFILE):
        with open(KEYFILE) as fh:
            stub.load_keypair(json.load(fh))
        return stub

    stub.register()
    with open(KEYFILE, "w") as fh:
        json.dump(stub.export_keypair(), fh, indent=2)
    print("Registered %s. Keypair saved to .stub-keys.json, keep it." % operator_id)
    return stub
