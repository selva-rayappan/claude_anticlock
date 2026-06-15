# Test Template

Reference patterns for unit and integration tests in OpsNext.

---

## Java — Service Unit Test

```java
// backend/src/test/java/io/opsnext/api/{module}/{Resource}ServiceTest.java
package io.opsnext.api.{module};

import io.opsnext.api.common.exception.AppException;
import io.opsnext.api.{module}.dto.Create{Resource}Request;
import io.opsnext.api.{module}.dto.{Resource}Response;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class {Resource}ServiceTest {

    @Mock
    private {Resource}Repository repository;

    @Mock
    private AuditService auditService;

    @Mock
    private SearchSyncQueue searchSyncQueue;

    @Mock
    private TenantEventBus eventBus;

    @InjectMocks
    private {Resource}Service service;

    private final SecurityPrincipal principal = SecurityPrincipal.of("user-1", "tenant-1", List.of("SALES_REP"));

    @Test
    void create_withValidRequest_savesAndReturnsResponse() {
        // Arrange
        var request = new Create{Resource}Request("Jane", "Doe", "jane@acme.com", null);
        var saved = new {Resource}();
        saved.setId("resource-1");
        when(repository.existsByEmailAndDeletedAtIsNull("jane@acme.com")).thenReturn(false);
        when(repository.save(any())).thenReturn(saved);

        // Act
        {Resource}Response result = service.create(request, principal);

        // Assert
        assertThat(result.id()).isEqualTo("resource-1");
        verify(auditService).log(eq("{RESOURCE}"), eq("resource-1"), eq(AuditAction.CREATE), any(), isNull(), any());
        verify(searchSyncQueue).enqueue(any(SearchSyncJob.class));
        verify(eventBus).publish(any());
    }

    @Test
    void create_withDuplicateEmail_throwsConflict() {
        when(repository.existsByEmailAndDeletedAtIsNull("jane@acme.com")).thenReturn(true);

        assertThatThrownBy(() -> service.create(
            new Create{Resource}Request("Jane", "Doe", "jane@acme.com", null), principal
        )).isInstanceOf(AppException.class)
          .hasMessageContaining("already exists");
    }

    @Test
    void findById_withUnknownId_throwsNotFound() {
        when(repository.findByIdAndDeletedAtIsNull("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById("unknown", principal))
            .isInstanceOf(AppException.class);
    }

    @Test
    void findById_withSoftDeletedRecord_throwsNotFound() {
        // Soft-deleted records must not be returned
        when(repository.findByIdAndDeletedAtIsNull("deleted-id")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById("deleted-id", principal))
            .isInstanceOf(AppException.class);
    }
}
```

---

## Java — Controller Integration Test

```java
// backend/src/test/java/io/opsnext/api/{module}/{Resource}ControllerTest.java
package io.opsnext.api.{module};

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({Resource}Controller.class)
class {Resource}ControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockBean {Resource}Service service;

    @Test
    @WithMockUser(roles = "SALES_REP")
    void create_withValidBody_returns201() throws Exception {
        var request = new Create{Resource}Request("Jane", "Doe", "jane@acme.com", null);
        var response = new {Resource}Response("resource-1", "Jane", "Doe", "jane@acme.com", "user-1", Instant.now(), Instant.now());
        when(service.create(any(), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/{resources}")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.id").value("resource-1"));
    }

    @Test
    @WithMockUser(roles = "SALES_REP")
    void create_withMissingEmail_returns400() throws Exception {
        var request = Map.of("firstName", "Jane", "lastName", "Doe"); // missing email

        mockMvc.perform(post("/api/v1/{resources}")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void create_withoutAuthentication_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/{resources}")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isUnauthorized());
    }
}
```

---

## Java — Tenant Isolation Test

```java
// Must verify that tenant A's data is inaccessible to tenant B
@Test
void tenantIsolation_tenantBCannotReadTenantARecords() {
    // Setup: create record in tenant A's schema
    TenantContext.set("tenant-a");
    {Resource} tenantARecord = repository.save(buildSample{Resource}());
    TenantContext.clear();

    // Act: try to read from tenant B's context
    TenantContext.set("tenant-b");
    Optional<{Resource}> result = repository.findByIdAndDeletedAtIsNull(tenantARecord.getId());
    TenantContext.clear();

    // Assert: not visible across schemas
    assertThat(result).isEmpty();
}
```

---

## TypeScript — TanStack Query Hook Test

```typescript
// frontend/src/__tests__/hooks/use-{resource}.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { use{Resource}s } from '@/hooks/use-{resource}';

const server = setupServer(
  http.get('/api/v1/{resources}', () =>
    HttpResponse.json({
      success: true,
      data: [{ id: '1', firstName: 'Jane', lastName: 'Doe', email: 'jane@acme.com' }],
      meta: { total: 1, nextCursor: null },
    })
  )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

test('fetches and returns {resource} list', async () => {
  const { result } = renderHook(() => use{Resource}s({}), { wrapper });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toHaveLength(1);
  expect(result.current.data?.[0].email).toBe('jane@acme.com');
});

test('handles API error gracefully', async () => {
  server.use(
    http.get('/api/v1/{resources}', () => HttpResponse.json({ success: false }, { status: 500 }))
  );

  const { result } = renderHook(() => use{Resource}s({}), { wrapper });

  await waitFor(() => expect(result.current.isError).toBe(true));
});
```
