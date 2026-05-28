<?php

return [
    'secret' => env('JWT_SECRET'),
    'expiration' => (int) env('JWT_EXPIRATION', 86400000),
];
