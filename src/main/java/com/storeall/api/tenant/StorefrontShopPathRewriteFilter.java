package com.storeall.api.tenant;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.storeall.api.repository.StoreRepository;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.FilterChain;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/**
 * Réécrit {@code /api/shop/{storeCode}/...} vers le chemin API historique via
 * {@link RequestDispatcher#forward(jakarta.servlet.ServletRequest, jakarta.servlet.ServletResponse)}.
 * <p>
 * Un simple {@link HttpServletRequestWrapper} passé à {@code filterChain.doFilter} faisait encore passer
 * la requête dans {@link org.springframework.web.filter.ServletRequestPathFilter} avec un
 * {@link jakarta.servlet.http.HttpServletMapping} Tomcat (PATH) incohérent avec l’URI réécrite → 500.
 * Le forward recrée une dispatch « normale » sur {@code /api/public/...}, etc.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class StorefrontShopPathRewriteFilter extends OncePerRequestFilter {

    private static final Pattern SHOP_PREFIX = Pattern.compile("^/api/shop/([a-zA-Z0-9_-]+)(/.*)$");

    private final StoreRepository storeRepository;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getDispatcherType() != DispatcherType.REQUEST;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
        String ctx = Optional.ofNullable(request.getContextPath()).orElse("");
        String fullUri = request.getRequestURI();
        String path = fullUri.startsWith(ctx) ? fullUri.substring(ctx.length()) : fullUri;
        if (!path.startsWith("/api/shop/")) {
            filterChain.doFilter(request, response);
            return;
        }
        Matcher m = SHOP_PREFIX.matcher(path);
        if (!m.matches()) {
            filterChain.doFilter(request, response);
            return;
        }
        String codeRaw = m.group(1);
        String rest = m.group(2);
        if (rest == null || rest.isBlank()) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "Missing path after store code");
            return;
        }
        String code = codeRaw.toLowerCase(Locale.ROOT);
        var storeOpt = storeRepository.findByCode(code);
        if (storeOpt.isEmpty() || !storeOpt.get().isActive()) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "Unknown or inactive store code");
            return;
        }
        String newPath = "/api" + rest;
        String newUri = ctx + newPath;
        RequestDispatcher dispatcher = request.getServletContext().getRequestDispatcher(newPath);
        if (dispatcher == null) {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "No dispatcher for path");
            return;
        }
        dispatcher.forward(new ShopTenantForwardRequest(request, newUri, newPath, code), response);
    }

    /**
     * Requête vue par la cible du forward : URI + servletPath alignés sur {@code newPath}, tenant en header.
     */
    private static final class ShopTenantForwardRequest extends HttpServletRequestWrapper {

        private final String rewrittenUri;
        private final String rewrittenServletPath;
        private final String storeCode;

        ShopTenantForwardRequest(HttpServletRequest request, String rewrittenUri, String rewrittenServletPath, String storeCode) {
            super(request);
            this.rewrittenUri = rewrittenUri;
            this.rewrittenServletPath = rewrittenServletPath;
            this.storeCode = storeCode;
        }

        @Override
        public String getRequestURI() {
            return rewrittenUri;
        }

        @Override
        public String getServletPath() {
            return rewrittenServletPath;
        }

        @Override
        public String getPathInfo() {
            return null;
        }

        @Override
        public String getHeader(String name) {
            if (StoreResolverService.STORE_HEADER.equalsIgnoreCase(name)) {
                return storeCode;
            }
            return super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            if (StoreResolverService.STORE_HEADER.equalsIgnoreCase(name)) {
                return Collections.enumeration(List.of(storeCode));
            }
            return super.getHeaders(name);
        }
    }
}
