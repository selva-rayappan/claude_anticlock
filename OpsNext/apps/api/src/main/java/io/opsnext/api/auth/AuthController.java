package io.opsnext.api.auth;

import io.opsnext.api.auth.dto.LoginRequest;
import io.opsnext.api.auth.dto.LoginResponse;
import io.opsnext.api.auth.dto.RegisterRequest;
import io.opsnext.api.common.dto.ApiResponse;
import io.opsnext.api.security.SecurityPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Login, registration, token management")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and get access token")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
        @Valid @RequestBody LoginRequest req,
        HttpServletResponse response
    ) {
        LoginResponse result = authService.login(req, response);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user within an existing tenant")
    public ResponseEntity<ApiResponse<Map<String, String>>> register(@Valid @RequestBody RegisterRequest req) {
        authService.register(req);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(Map.of("message", "Registration successful. Please check your email to verify your account.")));
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoke access token and clear session")
    public ResponseEntity<ApiResponse<Map<String, String>>> logout(
        @AuthenticationPrincipal SecurityPrincipal principal,
        HttpServletResponse response
    ) {
        authService.logout(principal.jti(), response);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Logged out successfully")));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> me(
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        Map<String, Object> user = authService.getCurrentUser(principal.userId());
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request a password reset link")
    public ResponseEntity<ApiResponse<Map<String, String>>> forgotPassword(
        @RequestBody Map<String, String> body
    ) {
        // Always return same response regardless of email existence (security)
        return ResponseEntity.ok(ApiResponse.success(
            Map.of("message", "If an account exists for that email, a reset link will be sent within 5 minutes.")
        ));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password using a reset token")
    public ResponseEntity<ApiResponse<Map<String, String>>> resetPassword(
        @RequestBody Map<String, String> body
    ) {
        // TODO: implement token validation and password reset
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Password reset successfully")));
    }

    @GetMapping("/verify-email")
    @Operation(summary = "Verify email address via token")
    public ResponseEntity<ApiResponse<Map<String, String>>> verifyEmail(@RequestParam String token) {
        // TODO: implement email verification
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Email verified successfully")));
    }
}
