# Version Management Implementation Plan

## Overview

This plan implements a comprehensive version management system for the Drevo Web application that provides version information both in PM2 status and within the Angular application. The system will generate appropriate versions based on deployment context:

- **Production**: Version based on Git tags (e.g., `1.2.3`)
- **Staging**: Date-time format (e.g., `20240927-1430`)
- **Manual builds**: Date-time-dev format (e.g., `20240927-1430-dev`)

The solution integrates version information throughout the deployment pipeline, making it available to PM2 process management and the Angular application runtime.

## Requirements

### Functional Requirements
1. **Version Generation**: Automatically generate versions during CI/CD based on deployment context
2. **PM2 Integration**: Display version information in `pm2 status` and process metadata
3. **Application Integration**: Make version accessible within Angular application for UI display
4. **Environment Detection**: Different version formats for production, staging, and development
5. **Build-time Injection**: Inject version during Angular build process
6. **Runtime Access**: Provide version information at application runtime

### Non-Functional Requirements
1. **Zero Breaking Changes**: Implementation must not break existing functionality
2. **Backward Compatibility**: Support existing deployment processes
3. **Performance**: Minimal impact on build and runtime performance
4. **Maintainability**: Clear, documented approach for future modifications

## Implementation Steps

### Phase 1: Version Generation and Environment Setup

#### Step 1.1: Create Version Generation Utility
- Create `scripts/generate-version.js` utility script
- Implement logic for different version formats based on environment
- Support for production (tag-based), staging (datetime), and development (datetime-dev)
- Add validation for version format consistency

#### Step 1.2: Update Environment Configuration Files
- Modify `apps/client/src/environments/environment.ts` for development
- Update `apps/client/src/environments/environment.prod.ts` for production
- Create `apps/client/src/environments/environment.staging.ts` for staging
- Add version field to environment configuration

#### Step 1.3: Create Version Service
- Implement `apps/client/src/app/services/version/version.service.ts`
- Provide methods to access version information at runtime
- Include build timestamp and environment detection
- Add service to application providers

### Phase 2: Build Process Integration

#### Step 2.1: Update Build Configuration
- Modify Angular build configuration to inject version at build time
- Update `apps/client/project.json` build targets
- Configure environment-specific builds with version injection
- Ensure version is available during SSR builds

#### Step 2.2: Update Package.json Scripts
- Add version generation to build scripts
- Create environment-specific build commands
- Integrate version generation with existing build process
- Maintain backward compatibility with current scripts

#### Step 2.3: Update Nx Configuration
- Modify `nx.json` target defaults if needed
- Ensure version generation works with Nx caching
- Add version-related inputs to cache configuration

### Phase 3: CI/CD Pipeline Integration

#### Step 3.1: Update Production Workflow
- Modify `.github/workflows/cd-production.yml`
- Generate version from Git tags
- Pass version as environment variable during build
- Update deployment action to include version metadata

#### Step 3.2: Update Staging Workflow
- Modify `.github/workflows/cd-staging.yml`
- Generate datetime-based version for staging
- Pass version as environment variable during build
- Ensure version consistency between build and deployment

#### Step 3.3: Update Deployment Action
- Modify `.github/actions/deploy/action.yml`
- Pass version information to deployment scripts
- Create package.json with version in deployment directory for PM2 detection

### Phase 4: PM2 Integration

#### Step 4.1: Update PM2 Configuration
- Keep `scripts/ecosystem.config.js` minimal (no version field needed)
- Ensure APP_VERSION environment variable is set for application access
- PM2 version display will be handled via package.json in deployment directory

#### Step 4.2: Update Deployment Script
- Modify `scripts/deploy.sh`
- Accept version parameter from CI/CD pipeline
- Create package.json file with version in deployment directory
- Set APP_VERSION environment variable for application
- Add version verification in deployment process

#### Step 4.3: Create Package.json Version Files
- Create package.json with version in each deployment directory (`cwd` path)
- Format: `{"name": "drevo-staging|drevo-production", "version": "X.X.X"}`
- Place package.json alongside server.mjs for PM2 to detect version
- This enables version display in `pm2 status` and `pm2 show` commands

### Phase 5: Application Runtime Integration

#### Step 5.1: Create Version Display Component
- Implement version display component for admin/debug purposes
- Add version information to application footer or admin panel
- Ensure version is accessible in development mode

#### Step 5.2: Update Server Configuration
- Modify `apps/client/src/server.ts` for SSR
- Ensure version is available during server-side rendering
- Add version to response headers if needed

#### Step 5.3: Add Version API Endpoint
- Create API endpoint to expose version information
- Make version accessible via HTTP request
- Useful for monitoring and health checks

### Phase 6: Testing and Documentation

#### Step 6.1: Update Tests
- Add tests for version service
- Test version generation utility
- Ensure build process tests include version validation
- Add integration tests for version display

#### Step 6.2: Create Documentation
- Document version management system
- Create deployment guide with version information
- Update README with version-related information
- Document troubleshooting for version-related issues

#### Step 6.3: Add Development Tools
- Create scripts for local version testing
- Add version validation to development workflow
- Ensure version works in development environment

## Deliverables

### Phase 1 Deliverables
- Version generation utility script
- Updated environment configuration files
- Version service implementation
- Basic version display capability

### Phase 2 Deliverables
- Updated build configuration with version injection
- Modified package.json scripts
- Version-aware build process
- Working local development version

### Phase 3 Deliverables
- Updated CI/CD workflows with version generation
- Version-integrated deployment process
- Automated version handling in pipelines
- Version consistency across environments

### Phase 4 Deliverables
- Updated deployment scripts that create package.json with version
- Version display in PM2 status via package.json detection
- APP_VERSION environment variable for application access
- Process management with version tracking

### Phase 5 Deliverables
- Runtime version access in Angular application
- Version display component
- Server-side version integration
- API endpoint for version information

### Phase 6 Deliverables
- Comprehensive test suite for version functionality
- Complete documentation
- Development tools and scripts
- Production-ready version management system

## Testing

### Unit Tests
- **Version Service Tests**: Test version retrieval and formatting
- **Version Generation Tests**: Test utility script with different inputs
- **Environment Configuration Tests**: Verify version is properly injected
- **Component Tests**: Test version display components

### Integration Tests
- **Build Process Tests**: Verify version is correctly built into application
- **CI/CD Pipeline Tests**: Test version generation in different workflows
- **PM2 Integration Tests**: Verify version appears in PM2 status
- **API Endpoint Tests**: Test version API responses

### End-to-End Tests
- **Deployment Tests**: Test complete deployment with version
- **Version Display Tests**: Verify version appears correctly in UI
- **Environment Tests**: Test version behavior across environments
- **Rollback Tests**: Ensure version tracking works during rollbacks

### Manual Testing Scenarios
- Deploy to staging and verify version format
- Deploy to production and verify tag-based version
- Check PM2 status shows correct version
- Verify version appears in application UI
- Test manual builds show dev version format

## Plan Review and Analysis

### Advantages
1. **Comprehensive Coverage**: Addresses all requirements from CI/CD to runtime
2. **Phased Approach**: Allows incremental implementation without breaking existing functionality
3. **Multi-Environment Support**: Handles production, staging, and development scenarios
4. **Integration Points**: Covers PM2, Angular app, and deployment pipeline
5. **Maintainable**: Clear structure with reusable utilities and services
6. **Testable**: Each phase includes specific testing requirements

### Potential Risks and Challenges
1. **Build Process Complexity**: Adding version injection could complicate builds
   - *Mitigation*: Use environment variables and simple file replacement
2. **PM2 Version Detection**: Dependency on package.json file creation in deployment directory
   - *Mitigation*: Ensure deployment script creates package.json before PM2 restart, add validation
3. **Cache Invalidation**: Version changes might affect Nx caching
   - *Mitigation*: Properly configure cache inputs to include version-related files
4. **SSR Compatibility**: Version injection must work with server-side rendering
   - *Mitigation*: Test SSR builds thoroughly and use environment variables

### Improvements and Additional Steps
1. **Version History**: Consider maintaining version history in deployment logs
2. **Health Checks**: Add version to application health check endpoints
3. **Monitoring Integration**: Send version information to monitoring systems
4. **Automated Rollback**: Implement version-aware rollback functionality
5. **Development Tools**: Create CLI tools for version management during development

### Implementation Priority
1. **High Priority**: Phase 1-3 (Core version generation and CI/CD integration)
2. **Medium Priority**: Phase 4-5 (PM2 and runtime integration)
3. **Low Priority**: Phase 6 (Documentation and additional tooling)

This plan provides a solid foundation for implementing comprehensive version management while maintaining system stability and allowing for incremental deployment of features.