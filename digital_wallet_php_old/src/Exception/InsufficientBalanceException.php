<?php

namespace App\Exception;

class InsufficientBalanceException extends AppException
{
    public function __construct(string $message)
    {
        parent::__construct(400, $message);
    }
}
