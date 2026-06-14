package io.opsnext.api.account;

import io.opsnext.api.account.dto.AccountRequest;
import io.opsnext.api.common.dto.ApiResponse;
import io.opsnext.api.common.dto.PageResponse;
import io.opsnext.api.security.SecurityPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/accounts")
@RequiredArgsConstructor
@Tag(name = "Accounts")
@SecurityRequirement(name = "bearerAuth")
public class AccountController {

    private final AccountService accountService;

    @GetMapping
    @Operation(summary = "List accounts")
    public ApiResponse<PageResponse<Map<String, Object>>> list(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "25") int limit,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String ownerId,
        @RequestParam(required = false) String industry,
        @RequestParam(defaultValue = "created_at") String sort,
        @RequestParam(defaultValue = "desc") String order,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(
            accountService.list(page, limit, search, ownerId, industry, sort, order, principal)
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new account")
    public ApiResponse<Map<String, Object>> create(
        @Valid @RequestBody AccountRequest.Create req,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(accountService.create(req, principal));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get account by ID")
    public ApiResponse<Map<String, Object>> getById(
        @PathVariable String id,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(accountService.getById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an account")
    public ApiResponse<Map<String, Object>> update(
        @PathVariable String id,
        @Valid @RequestBody AccountRequest.Update req,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(accountService.update(id, req, principal));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete an account (soft delete)")
    public void delete(
        @PathVariable String id,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        accountService.delete(id, principal);
    }

    @GetMapping("/{id}/contacts")
    @Operation(summary = "List contacts for an account")
    public ApiResponse<List<Map<String, Object>>> getContacts(
        @PathVariable String id,
        @AuthenticationPrincipal SecurityPrincipal principal
    ) {
        return ApiResponse.success(accountService.getContacts(id));
    }
}
