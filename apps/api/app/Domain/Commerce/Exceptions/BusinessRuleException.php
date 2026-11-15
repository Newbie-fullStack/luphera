<?php

namespace App\Domain\Commerce\Exceptions;

use Exception;

/**
 * A business rule refused the request. Rendered as the API error envelope with
 * a stable machine code, so the front can translate the message itself.
 */
final class BusinessRuleException extends Exception
{
    /**
     * @param array<string, list<string>> $fields
     */
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly array $fields = [],
        public readonly int $status = 422,
    ) {
        parent::__construct($message);
    }
}
