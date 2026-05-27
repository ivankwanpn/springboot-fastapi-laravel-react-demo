<?php

namespace App\Exception;

class WalletNotFoundException extends AppException
{
    public function __construct(string $message)
    {
        parent::__construct(404, $message);
    }
}
