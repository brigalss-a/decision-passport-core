from .chain import GENESIS_HASH, assert_valid_chain, create_record, verify_chain
from .diff_bundles import diff_bundles
from .explain_tamper import explain_tamper_chain
from .fixtures import load_fixture
from .manifest import create_manifest

__version__ = "0.6.0"

# Public alias to match TypeScript naming and public docs.
explain_tamper = explain_tamper_chain


def verify_basic_bundle(bundle: object):
    from .verify import verify_basic_bundle as _verify_basic_bundle

    return _verify_basic_bundle(bundle)


def validate_bundle_schema(bundle: object):
    from .verify import validate_bundle_schema as _validate_bundle_schema

    return _validate_bundle_schema(bundle)

__all__ = [
    "GENESIS_HASH",
    "assert_valid_chain",
    "create_manifest",
    "create_record",
    "diff_bundles",
    "explain_tamper",
    "explain_tamper_chain",
    "load_fixture",
    "validate_bundle_schema",
    "verify_basic_bundle",
]
