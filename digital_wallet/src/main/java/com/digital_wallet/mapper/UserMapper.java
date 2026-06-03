package com.digital_wallet.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.digital_wallet.model.entity.User;

@Mapper
public interface UserMapper {
    int insert(User user);

    User findByUsername(String username);

    User findById(@Param("id") Long id);

    List<User> findAllWithPagination(@Param("search") String search, @Param("offset") int offset, @Param("limit") int limit);

    int countAll(@Param("search") String search);

    int updateRole(@Param("id") Long id, @Param("role") String role);
}
