package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAuthFlow_CompleteRegistrationAndLogin(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	// Test data
	email := "integration@example.com"
	password := "SecurePassword123!"
	name := "Integration Test User"

	t.Run("1. Register new user", func(t *testing.T) {
		payload := map[string]string{
			"email":    email,
			"password": password,
			"name":     name,
		}

		body, _ := json.Marshal(payload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		assert.True(t, result["success"].(bool))
		assert.NotEmpty(t, result["token"])

		user := result["user"].(map[string]interface{})
		assert.Equal(t, email, user["email"])
		assert.Equal(t, name, user["name"])
	})

	t.Run("2. Fail to register duplicate user", func(t *testing.T) {
		payload := map[string]string{
			"email":    email,
			"password": password,
			"name":     name,
		}

		body, _ := json.Marshal(payload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		assert.False(t, result["success"].(bool))
		assert.Contains(t, result["message"].(string), "already exists")
	})

	t.Run("3. Login with correct credentials", func(t *testing.T) {
		payload := map[string]string{
			"email":    email,
			"password": password,
		}

		body, _ := json.Marshal(payload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/login"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		assert.True(t, result["success"].(bool))
		assert.NotEmpty(t, result["token"])

		user := result["user"].(map[string]interface{})
		assert.Equal(t, email, user["email"])
	})

	t.Run("4. Fail to login with wrong password", func(t *testing.T) {
		payload := map[string]string{
			"email":    email,
			"password": "WrongPassword123!",
		}

		body, _ := json.Marshal(payload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/login"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		assert.False(t, result["success"].(bool))
	})

	t.Run("5. Fail to login with non-existent user", func(t *testing.T) {
		payload := map[string]string{
			"email":    "nonexistent@example.com",
			"password": password,
		}

		body, _ := json.Marshal(payload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/login"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
}

func TestAuthFlow_ProtectedEndpoints(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	email := "protected@example.com"
	password := "SecurePassword123!"
	var token string

	// Register and login to get token
	t.Run("Setup: Register and login", func(t *testing.T) {
		// Register
		payload := map[string]string{
			"email":    email,
			"password": password,
			"name":     "Protected Test User",
		}
		body, _ := json.Marshal(payload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		token = result["token"].(string)
		assert.NotEmpty(t, token)
	})

	t.Run("Access /me endpoint with valid token", func(t *testing.T) {
		req, _ := http.NewRequest("GET", ts.URL("/api/auth/me"), nil)
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)

		assert.True(t, result["success"].(bool))
		user := result["user"].(map[string]interface{})
		assert.Equal(t, email, user["email"])
	})

	t.Run("Fail to access /me without token", func(t *testing.T) {
		req, _ := http.NewRequest("GET", ts.URL("/api/auth/me"), nil)

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("Fail to access /me with invalid token", func(t *testing.T) {
		req, _ := http.NewRequest("GET", ts.URL("/api/auth/me"), nil)
		req.Header.Set("Authorization", "Bearer invalid-token-12345")

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
}

func TestAuthFlow_PasswordChange(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	email := "password-change@example.com"
	oldPassword := "OldPassword123!"
	newPassword := "NewPassword456!"
	var token string

	// Setup: Register user
	t.Run("Setup: Register user", func(t *testing.T) {
		payload := map[string]string{
			"email":    email,
			"password": oldPassword,
			"name":     "Password Change User",
		}
		body, _ := json.Marshal(payload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		token = result["token"].(string)
	})

	t.Run("Change password successfully", func(t *testing.T) {
		payload := map[string]string{
			"currentPassword": oldPassword,
			"newPassword":     newPassword,
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", ts.URL("/api/auth/change-password"), bytes.NewBuffer(body))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := ts.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)
		assert.True(t, result["success"].(bool))
	})

	t.Run("Login with new password", func(t *testing.T) {
		payload := map[string]string{
			"email":    email,
			"password": newPassword,
		}
		body, _ := json.Marshal(payload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/login"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)
		assert.True(t, result["success"].(bool))
		assert.NotEmpty(t, result["token"])
	})

	t.Run("Fail to login with old password", func(t *testing.T) {
		payload := map[string]string{
			"email":    email,
			"password": oldPassword,
		}
		body, _ := json.Marshal(payload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/login"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
}

func TestAuthFlow_EmailNormalization(t *testing.T) {
	ts := SetupTestServer(t)
	if ts == nil {
		t.Skip("Skipping integration test: test server not available")
	}
	defer ts.Close()

	baseEmail := "test@example.com"
	password := "Password123!"

	// Register with lowercase email
	t.Run("Register with lowercase email", func(t *testing.T) {
		payload := map[string]string{
			"email":    baseEmail,
			"password": password,
			"name":     "Test User",
		}
		body, _ := json.Marshal(payload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)
	})

	// Login with uppercase email (should work due to normalization)
	t.Run("Login with uppercase email", func(t *testing.T) {
		payload := map[string]string{
			"email":    "TEST@EXAMPLE.COM",
			"password": password,
		}
		body, _ := json.Marshal(payload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/login"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]interface{}
		err = json.NewDecoder(resp.Body).Decode(&result)
		require.NoError(t, err)
		assert.True(t, result["success"].(bool))
	})

	// Try to register with uppercase (should fail - already exists)
	t.Run("Cannot register duplicate with different case", func(t *testing.T) {
		payload := map[string]string{
			"email":    "TEST@EXAMPLE.COM",
			"password": password,
			"name":     "Test User 2",
		}
		body, _ := json.Marshal(payload)
		resp, err := ts.Client.Post(ts.URL("/api/auth/register"), "application/json", bytes.NewBuffer(body))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})
}
