<?php

namespace App\Exceptions;

use Exception;

class AppException extends Exception
{
    public function __construct(
        private int $statusCode,
        string $message = ''
    ) {
        parent::__construct($message);
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }
}
