package com.neverfail.auth;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class JwtAuthFilter implements Filter {
    private final JwtUtil jwtUtil;
    public JwtAuthFilter(JwtUtil jwtUtil) { this.jwtUtil = jwtUtil; }

    // Routes that don't require a token. Everything else under /api/** does.
    private static final String[] PUBLIC_PATHS = { "/api/auth/register", "/api/auth/login" };

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;
        String path = request.getRequestURI();

        if (!path.startsWith("/api/") || isPublic(path) || request.getMethod().equals("OPTIONS")) {
            chain.doFilter(req, res);
            return;
        }

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing token");
            return;
        }

        Long userId = jwtUtil.validateAndGetUserId(header.substring(7));
        if (userId == null) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired token");
            return;
        }

        request.setAttribute("userId", userId);
        chain.doFilter(req, res);
    }

    private boolean isPublic(String path) {
        for (String p : PUBLIC_PATHS) if (path.equals(p)) return true;
        return false;
    }
}
