<?php

namespace App\Http\Controllers;

use App\Services\AdminService;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    private AdminService $adminService;

    public function __construct(AdminService $adminService)
    {
        $this->adminService = $adminService;
    }

    public function listUsers(Request $request)
    {
        $search = $request->query('search', '');
        $page = (int) $request->query('page', 1);
        $size = (int) $request->query('size', 20);

        $result = $this->adminService->listUsers($search, $page, $size);

        return response()->json($result);
    }

    public function getUserDetail(Request $request, $id)
    {
        $result = $this->adminService->getUserDetail($id);

        return response()->json($result);
    }

    public function disableUser(Request $request, $id)
    {
        $this->adminService->disableUser($id);

        return response()->json([
            'status' => 'SUCCESS',
            'message' => 'User disabled successfully',
        ]);
    }

    public function enableUser(Request $request, $id)
    {
        $this->adminService->enableUser($id);

        return response()->json([
            'status' => 'SUCCESS',
            'message' => 'User enabled successfully',
        ]);
    }

    public function listTransactions(Request $request)
    {
        $page = (int) $request->query('page', 1);
        $size = (int) $request->query('size', 20);
        $username = $request->query('username', '');
        $startDate = $request->query('startDate', '');
        $endDate = $request->query('endDate', '');

        $result = $this->adminService->listTransactions($page, $size, $username, $startDate, $endDate);

        return response()->json($result);
    }

    public function getTransactionStats(Request $request)
    {
        $startDate = $request->query('startDate', '');
        $endDate = $request->query('endDate', '');

        $result = $this->adminService->getTransactionStats($startDate, $endDate);

        return response()->json($result);
    }
}
