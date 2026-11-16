<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\UpdateProfileRequest;
use App\Http\Resources\Account\UserResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return ApiResponse::data(UserResource::make($this->user($request)));
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $this->user($request);

        $user->fill($request->safe()->only(['name', 'email', 'marketing_opt_in']));
        $user->save();

        return ApiResponse::data(UserResource::make($user->refresh()));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return $user;
    }
}
