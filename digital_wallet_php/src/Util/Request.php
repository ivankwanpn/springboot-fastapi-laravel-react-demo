<?php

namespace App\Util;

class Request
{
    private array $body;
    private array $headers;
    private array $attributes = [];

    public function __construct()
    {
        $raw = file_get_contents('php://input');
        $decoded = json_decode($raw ?: '{}', true);
        $this->body = is_array($decoded) ? $decoded : [];

        $this->headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $headerName = strtolower(str_replace('_', '-', substr($key, 5)));
                $this->headers[$headerName] = $value;
            }
        }
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    public function getBody(): array
    {
        return $this->body;
    }

    public function header(string $name, mixed $default = null): ?string
    {
        return $this->headers[strtolower($name)] ?? $default;
    }

    public function setAttribute(string $key, mixed $value): void
    {
        $this->attributes[$key] = $value;
    }

    public function getAttribute(string $key): mixed
    {
        return $this->attributes[$key] ?? null;
    }
}
