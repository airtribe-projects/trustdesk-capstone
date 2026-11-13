package com.trustdesk.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Order(1)
public class AuthFilter implements Filter {

    @Value("${trustdesk.auth.token}")
    private String expectedToken;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        String path = req.getRequestURI();

        // Allow CORS preflight and non-API paths
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())
                || !path.startsWith("/api/")
                || path.equals("/api/health")) {
            chain.doFilter(request, response);
            return;
        }

        String token = req.getHeader("X-Auth-Token");
        if (token == null || !token.equals(expectedToken)) {
            res.setStatus(401);
            res.setContentType("application/json");
            res.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Valid X-Auth-Token header required\"}");
            return;
        }

        chain.doFilter(request, response);
    }
}
