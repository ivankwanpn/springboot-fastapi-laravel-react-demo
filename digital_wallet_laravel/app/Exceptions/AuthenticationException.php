<?php

namespace App\Exceptions;

class AuthenticationException extends AppException
{
    public function __construct(string $message = 'Invalid username or password')
    {
        parent::__construct(401, $message);
    }
}
