package com.storeall.api.security;

import java.io.IOException;
import java.time.Duration;
import java.util.Locale;
import java.util.regex.Pattern;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.storeall.api.config.AppProperties;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Pattern SHOP_ORDERS = Pattern.compile("^/api/shop/[^/]+/orders$");

    private final RateLimitService rateLimitService;
    private final AppProperties.RateLimit rateLimitConfig;

    public RateLimitFilter(RateLimitService rateLimitService, AppProperties appProperties) {
        this.rateLimitService = rateLimitService;
        this.rateLimitConfig = appProperties.getRateLimit();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!rateLimitConfig.isEnabled() || !"POST".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = normalizePath(request);
        String bucket = resolveBucket(path);
        if (bucket == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientKey = resolveClientIp(request) + ":" + bucket;
        int maxRequests = "login".equals(bucket) ? rateLimitConfig.getLoginMaxPerMinute()
                : rateLimitConfig.getOrdersMaxPerMinute();

        if (!rateLimitService.tryConsume(clientKey, maxRequests, Duration.ofMinutes(1))) {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"message\":\"Trop de requêtes. Réessayez dans une minute.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static String normalizePath(HttpServletRequest request) {
        String ctx = request.getContextPath() != null ? request.getContextPath() : "";
        String uri = request.getRequestURI() != null ? request.getRequestURI() : "";
        if (ctx.length() > 0 && uri.startsWith(ctx)) {
            uri = uri.substring(ctx.length());
        }
        return uri;
    }

    private static String resolveBucket(String path) {
        if ("/api/orders".equals(path) || SHOP_ORDERS.matcher(path).matches()) {
            return "orders";
        }
        if ("/api/auth/login".equals(path) || "/api/login".equals(path)) {
            return "login";
        }
        return null;
    }

    private static String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String first = forwarded.split(",")[0].trim();
            if (!first.isEmpty()) {
                return first.toLowerCase(Locale.ROOT);
            }
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim().toLowerCase(Locale.ROOT);
        }
        String remote = request.getRemoteAddr();
        return remote != null ? remote.toLowerCase(Locale.ROOT) : "unknown";
    }
}
