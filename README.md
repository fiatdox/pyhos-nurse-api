# Nurse API Service

Backend API service for hospital nursing operations, built with [Bun](https://bun.sh) and [ElysiaJS](https://elysiajs.com).

## Features

- **Authentication**: JWT-based login and refresh token mechanism.
- **Patient Management**:
  - Register new patients.
  - Retrieve patient lists by Ward or AN.
  - Record patient status per shift (Severity, Ventilator, Comments).
- **Nutrition/Dietary**:
  - View food menus and meal types.
  - Bulk order meals for patients.
  - Bulk cancel orders.
- **System Data**:
  - Manage Staff information.
  - Master data for Wards, Specialties, Admission Types, etc.
- **Logging**:
  - Custom logger middleware with colorized console output.
  - Daily access logs saved to file.
  - Automated log cleanup script.

## Tech Stack

- **Runtime**: Bun
- **Framework**: ElysiaJS
- **Database**: MySQL (via `mysql2`)
- **Authentication**: @elysiajs/jwt

## Getting Started

### Prerequisites

- Bun (v1.0 or later)
- MySQL Database

### Installation

1. Install dependencies:
```bash
bun install
```

## Development
To start the development server run:
```bash
bun run dev
```

Open http://localhost:3000/ with your browser to see the result.