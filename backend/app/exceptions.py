from fastapi import HTTPException


class Route53Exception(HTTPException):
    def __init__(self, status_code: int, error: str, message: str):
        super().__init__(status_code=status_code, detail={"error": error, "message": message})
        self.error_type = error


class NoSuchHostedZone(Route53Exception):
    def __init__(self):
        super().__init__(
            status_code=404,
            error="NoSuchHostedZone",
            message="No hosted zone exists with the ID that you specified.",
        )


class HostedZoneAlreadyExists(Route53Exception):
    def __init__(self):
        super().__init__(
            status_code=409,
            error="HostedZoneAlreadyExists",
            message="The hosted zone you're trying to create already exists.",
        )


class HostedZoneNotEmpty(Route53Exception):
    def __init__(self):
        super().__init__(
            status_code=400,
            error="HostedZoneNotEmpty",
            message="The hosted zone contains resource records that are not SOA or NS records.",
        )


class NoSuchRecord(Route53Exception):
    def __init__(self):
        super().__init__(
            status_code=404,
            error="NoSuchRecord",
            message="No resource record set exists with the ID that you specified.",
        )


class InvalidChangeBatch(Route53Exception):
    def __init__(self, messages: list[str] | None = None):
        msgs = messages or ["One or more changes in the batch are invalid."]
        super().__init__(
            status_code=400,
            error="InvalidChangeBatch",
            message="; ".join(msgs),
        )


class InvalidInput(Route53Exception):
    def __init__(self, message: str = "The input is not valid."):
        super().__init__(
            status_code=400,
            error="InvalidInput",
            message=message,
        )


class NoSuchChange(Route53Exception):
    def __init__(self):
        super().__init__(
            status_code=404,
            error="NoSuchChange",
            message="A change with the specified change ID does not exist.",
        )


class TooManyHostedZones(Route53Exception):
    def __init__(self):
        super().__init__(
            status_code=400,
            error="TooManyHostedZones",
            message="The maximum number of hosted zones has been reached.",
        )


class ConflictingDomainExists(Route53Exception):
    def __init__(self):
        super().__init__(
            status_code=400,
            error="ConflictingDomainExists",
            message="A hosted zone with the specified name already exists.",
        )


class PriorRequestNotComplete(Route53Exception):
    def __init__(self):
        super().__init__(
            status_code=400,
            error="PriorRequestNotComplete",
            message="A previous request is still in progress. Please wait and try again.",
        )


class Unauthorized(Route53Exception):
    def __init__(self, message: str = "Authentication required."):
        super().__init__(
            status_code=401,
            error="Unauthorized",
            message=message,
        )
