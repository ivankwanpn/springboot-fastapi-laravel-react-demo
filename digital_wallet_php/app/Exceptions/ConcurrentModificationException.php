<?php

namespace App\Exceptions;

class ConcurrentModificationException extends AppException
{
    public function __construct(string $message)
    {
        parent::__construct(409, $message);
    }
}
