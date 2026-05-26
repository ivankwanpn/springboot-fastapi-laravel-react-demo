<?php

namespace App\Exceptions;

class DuplicateUsernameException extends AppException
{
    public function __construct(string $message)
    {
        parent::__construct(409, $message);
    }
}
